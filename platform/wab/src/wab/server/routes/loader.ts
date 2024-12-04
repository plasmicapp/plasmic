import { DbMgr } from "@/wab/server/db/DbMgr";
import { Project } from "@/wab/server/entities/Entities";
import {
  LATEST_LOADER_VERSION,
  LOADER_ASSETS_BUCKET,
  LOADER_CACHE_BUST,
  genLatestLoaderCodeBundle,
  genPublishedLoaderCodeBundle,
} from "@/wab/server/loader/gen-code-bundle";
import { genLoaderHtmlBundle } from "@/wab/server/loader/gen-html-bundle";
import {
  CodeModule,
  LoaderBundleOutput,
} from "@/wab/server/loader/module-bundler";
import {
  parseComponentProps,
  parseGlobalVariants,
} from "@/wab/server/loader/parse-query-params";
import {
  VersionToSync,
  getResolvedProjectVersions,
  mkVersionToSync,
  parseProjectIdSpec,
  resolveLatestProjectRevisions,
} from "@/wab/server/loader/resolve-projects";
import { superDbMgr, userAnalytics, userDbMgr } from "@/wab/server/routes/util";
import { prefillCloudfront } from "@/wab/server/workers/prefill-cloudfront";
import { BadRequestError, NotFoundError } from "@/wab/shared/ApiErrors/errors";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import { toClassName } from "@/wab/shared/codegen/util";
import {
  ensure,
  ensureArray,
  ensureInstance,
  hackyCast,
  tuple,
} from "@/wab/shared/common";
import { tplToPlasmicElements } from "@/wab/shared/element-repr/gen-element-repr-v2";
import { LocalizationKeyScheme } from "@/wab/shared/localization";
import { toJson } from "@/wab/shared/model/model-tree-util";
import { getCodegenUrl } from "@/wab/shared/urls";
import S3 from "aws-sdk/clients/s3";
import execa from "execa";
import { Request, Response } from "express-serve-static-core";
import fs from "fs";
import { isString } from "lodash";
import path from "path";

/**
 * Loader version is used for backwards compatibility (otherwise we could
 * end up breaking production websites).
 * Since we need to handle all previous versions, we want the API to be as
 * stable as possible and avoid breaking changes.
 *
 * Previous versions:
 * 0: Uses `preserveModules` and extracts the whole CSS to a single module
 * 1: Extracts separate CSS chunks for each component, but uses
 *   `preserveModules`, and makes each render file point to the respective
 *   CSS
 * 2: Provides the component dependency graph and turns off `preserveModules`;
 * 3: Loader expects browser and server builds.
 * 4: Expects activeSplits to be part of bundle;
 * https://gerrit.aws.plasmic.app/c/public-packages/+/9432
 * 5: host is now considered an external, must be swapped in by loader client]
 * 6: Add `useComponentSubstitutionApi`: expects the wrapper components to
 *    expose/use `getPlasmicComponent` and register
 *    `@plasmicapp/loader-runtime-registry` as an external
 * 7: Add `useGlobalVariantsSubstitutionApi`, to make global variants use the
 *    substitution api for loader.
 * 8: "next/router" now part of externals, swapped in at run time
 * 9: "@plasmicapp/data-sources-context" now part of externals, swapped in at run time
 * 10: add 'useCodeComponentRegistry' to support code component helpers
 */
function getLoaderVersion(req: Request) {
  const loaderVersion = (req.query.loaderVersion ||
    req.headers["x-plasmic-loader-version"]) as string | undefined;
  return parseInt(loaderVersion || "0");
}

function getLoaderOptions(req: Request) {
  return {
    platform:
      req.query.platform === "nextjs" || req.query.platform === "gatsby"
        ? req.query.platform
        : "react",
    nextjsAppDir: req.query.nextjsAppDir === "true",
    browserOnly: req.query.browserOnly === "true",
    projectIdSpecs: ensureArray(req.query.projectId) as string[],
    loaderVersion: getLoaderVersion(req),
    i18nKeyScheme: req.query.i18nKeyScheme as LocalizationKeyScheme | undefined,
    i18nTagPrefix: req.query.i18nTagPrefix as string | undefined,
    // Use true/undefined so that's only part of cache key when present
    skipHead: req.query.skipHead === "true" ? true : undefined,
  };
}

export async function buildPublishedLoaderAssets(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const {
    platform,
    nextjsAppDir,
    browserOnly,
    projectIdSpecs,
    loaderVersion,
    i18nKeyScheme,
    i18nTagPrefix,
    skipHead,
  } = getLoaderOptions(req);

  const resolvedProjectIdSpecs = await getResolvedProjectVersions(
    mgr,
    projectIdSpecs,
    { prefilledOnly: true }
  );

  const query = makeCacheableVersionedLoaderQuery({
    platform,
    nextjsAppDir,
    loaderVersion,
    resolvedProjectIdSpecs,
    browserOnly,
    i18nKeyScheme,
    i18nTagPrefix,
    skipHead,
  });

  req.promLabels.projectId = projectIdSpecs.join(",");
  redirectToCacheableResource(res, `/api/v1/loader/code/versioned?${query}`);
}

export function makeCacheableVersionedLoaderQuery({
  platform,
  nextjsAppDir,
  resolvedProjectIdSpecs,
  loaderVersion,
  browserOnly,
  i18nKeyScheme,
  i18nTagPrefix,
  skipHead,
}: {
  platform: string;
  nextjsAppDir: boolean;
  resolvedProjectIdSpecs: string[];
  loaderVersion: number | undefined;
  browserOnly: boolean;
  i18nKeyScheme?: string;
  i18nTagPrefix?: string;
  skipHead?: boolean;
}) {
  const query = new URLSearchParams();
  query.set("cb", LOADER_CACHE_BUST);
  query.set("platform", platform);
  if (nextjsAppDir) {
    query.set("nextjsAppDir", "true");
  }
  if (loaderVersion != null) {
    query.set("loaderVersion", `${loaderVersion}`);
  }
  resolvedProjectIdSpecs
    .sort()
    .forEach((spec) => query.append("projectId", spec));
  if (browserOnly) {
    query.set("browserOnly", "true");
  }
  if (i18nKeyScheme) {
    query.set("i18nKeyScheme", i18nKeyScheme);
  }
  if (i18nTagPrefix) {
    query.set("i18nTagPrefix", i18nTagPrefix);
  }
  if (skipHead) {
    query.set("skipHead", "true");
  }
  return query.toString();
}

export async function buildVersionedLoaderAssets(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const {
    platform,
    nextjsAppDir,
    browserOnly,
    projectIdSpecs,
    loaderVersion,
    i18nKeyScheme,
    i18nTagPrefix,
    skipHead,
  } = getLoaderOptions(req);

  const projectVersions = projectIdSpecs.map(parseProjectIdSpec);

  for (const { projectId, version } of projectVersions) {
    if (!version) {
      throw new BadRequestError(
        `Project ${projectId} does not have a specified version`
      );
    }
  }

  await Promise.all(
    projectVersions.map(({ projectId }) =>
      mgr.checkProjectPerms(projectId, "viewer", "get")
    )
  );

  const projects = await Promise.all(
    projectVersions.map(
      async ({ projectId }) => await mgr.getProjectById(projectId)
    )
  );
  trackLoaderCodegenEvent(req, projects, {
    versionType: "versioned",
    platform,
  });

  req.promLabels.projectId = projects.map((p) => p.id).join(",");

  const result = await genPublishedLoaderCodeBundle(
    mgr,
    req.workerpool,
    makeGenPublishedLoaderCodeBundleOpts({
      platform,
      appDir: nextjsAppDir,
      projectVersions: Object.fromEntries(
        projectVersions.map(({ projectId, version }) => [
          projectId,
          mkVersionToSync(
            ensure(version, "Unexpected nullish version in projectVersions")
          ),
        ])
      ),
      i18n: {
        keyScheme: i18nKeyScheme,
        tagPrefix: i18nTagPrefix,
      },
      loaderVersion,
      browserOnly,
      skipHead,
    })
  );

  const projectIds = projectVersions.map(({ projectId }) => projectId);

  await mgr.upsertLoaderPublishmentEntities({
    projectIds,
    platform,
    loaderVersion,
    browserOnly,
    i18nKeyScheme,
    i18nTagPrefix,
    appDir: nextjsAppDir,
  });

  setAsCacheableResource(res);
  res.json(result);
}

/**
 * Shared between prefill and real request to make sure we use the
 * same opts
 */
export function makeGenPublishedLoaderCodeBundleOpts(opts: {
  projectVersions: Record<string, VersionToSync>;
  platform: string | undefined;
  appDir: boolean | undefined;
  loaderVersion: number;
  browserOnly: boolean;
  i18n: {
    keyScheme: LocalizationKeyScheme | undefined;
    tagPrefix: string | undefined;
  };
  skipHead?: boolean;
}): Parameters<typeof genPublishedLoaderCodeBundle>[2] {
  const {
    platform,
    appDir,
    projectVersions,
    i18n,
    loaderVersion,
    browserOnly,
    skipHead,
  } = opts;
  return {
    platform,
    platformOptions: {
      nextjs: {
        appDir: appDir ?? false,
      },
    },
    projectVersions,
    i18nKeyScheme: i18n.keyScheme,
    i18nTagPrefix: i18n.tagPrefix,
    loaderVersion,
    browserOnly,
    preferEsbuild: true,
    skipHead,
  };
}

export async function buildLatestLoaderAssets(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const {
    platform,
    nextjsAppDir,
    browserOnly,
    projectIdSpecs,
    loaderVersion,
    i18nKeyScheme,
    i18nTagPrefix,
    skipHead,
  } = getLoaderOptions(req);

  const parsedProjectIdsSpecs = projectIdSpecs.map(parseProjectIdSpec);
  const projectIdsBranches = await Promise.all(
    parsedProjectIdsSpecs.map(async (pv) => {
      // We ignore pv.version, as preview:true should have higher priority over
      // versions. But we can't just ignore pv.tag, as it may be used for branches,
      // and maybe the user is trying to get the latest version of a branch.
      if (pv.tag) {
        // We need to check if pv.tag is a branch name or a pkgversion tag.
        // The only way to know is to try to find a branch with the same name...
        const branches = await mgr.listBranchesForProject(
          pv.projectId as ProjectId
        );
        if (branches.some((b) => b.name === pv.tag)) {
          // Found it!
          return {
            id: pv.projectId,
            branchName: pv.tag,
          };
        } else {
          // No matching branch, so assume this is a pkgversion tag,
          // which we don't care about for preview bundle
          return {
            id: pv.projectId,
            branchName: undefined,
          };
        }
      } else {
        return { id: pv.projectId, branchName: undefined };
      }
    })
  );
  await Promise.all(
    projectIdsBranches.map(({ id }) =>
      mgr.checkProjectPerms(id, "viewer", "get")
    )
  );

  // We set the projectIds and their current revisions as weak e-tag.  If the browser
  // sends a if-none-match with the same e-tag, we can check if any project has since
  // been updated, and skip re-generating code if so.
  const projectRevs = await resolveLatestProjectRevisions(
    mgr,
    projectIdsBranches
  );
  const etag = `W/"${LOADER_CACHE_BUST}-${Object.entries(projectRevs)
    .map(([pid, rev]) => `${pid}@${rev}`)
    .join(",")}"`;

  if (checkEtagSkippable(req, res, etag)) {
    return;
  }

  const projects = await Promise.all(
    projectIdsBranches.map(async ({ id }) => await mgr.getProjectById(id))
  );

  req.promLabels.projectId = projects.map((p) => p.id).join(",");
  trackLoaderCodegenEvent(req, projects, {
    versionType: "preview",
    platform,
  });

  const result = await genLatestLoaderCodeBundle(mgr, req.workerpool, {
    platform,
    platformOptions: {
      nextjs: {
        appDir: nextjsAppDir,
      },
    },
    projectIdsBranches: projectIdsBranches,
    loaderVersion,
    browserOnly,
    i18nKeyScheme,
    i18nTagPrefix,
    // always use esbuild for preview builds
    preferEsbuild: true,
    skipHead,
  });

  res.json(result);
}

export async function getLoaderChunk(req: Request, res: Response) {
  const fileNames = isString(req.query.fileName)
    ? req.query.fileName.split(",")
    : undefined;

  const bundleKey = req.query.bundleKey;

  if (!isString(bundleKey)) {
    throw new BadRequestError("Invalid `bundleKey` param: " + bundleKey);
  }

  if (!Array.isArray(fileNames)) {
    throw new BadRequestError(
      "Invalid `fileName` param: " + req.query.fileName
    );
  }

  const fileNamesSet = new Set(fileNames);

  console.log(`Loading S3 bundle from ${LOADER_ASSETS_BUCKET} ${bundleKey}`);

  const s3 = new S3();

  const obj = await s3
    .getObject({
      Bucket: LOADER_ASSETS_BUCKET,
      Key: bundleKey,
    })
    .promise();
  const serialized = ensureInstance(obj.Body, Buffer).toString("utf8");

  const bundle: LoaderBundleOutput = JSON.parse(serialized);

  const modules = (
    Array.isArray(bundle.modules) ? bundle.modules : bundle.modules.browser
  ).filter(
    (m): m is CodeModule => m.type === "code" && fileNamesSet.has(m.fileName)
  );

  if (!modules.length || !fileNames) {
    throw new NotFoundError(`chunk not found: ${fileNames.join(",")}`);
  }

  const response = `
    (() => {
      if (!globalThis.__PLASMIC_CHUNKS) {
        globalThis.__PLASMIC_CHUNKS = {};
      }
      ${modules
        .map((module) =>
          `globalThis.__PLASMIC_CHUNKS[${JSON.stringify(
            module.fileName
          )}] = ${JSON.stringify(module.code)};
          globalThis.__PlasmicBundlePromises[${JSON.stringify(
            "__promise_resolve_" + module.fileName
          )}]();`.trim()
        )
        .join("\n")}
    })()`.trim();
  setAsCacheableResource(res);
  res.setHeader("content-type", "text/javascript");
  res.send(response);
}

export async function buildPublishedLoaderHtml(req: Request, res: Response) {
  return buildPublishedLoaderRedirect(
    req,
    res,
    "html",
    true,
    new URLSearchParams([
      ["cb", LOADER_CACHE_BUST],
      ["embedHydrate", req.query.embedHydrate === "1" ? "1" : "0"],
      ["hydrate", req.query.hydrate === "1" ? "1" : "0"],
      [
        "componentProps",
        req.query.componentProps ? (req.query.componentProps as string) : "{}",
      ],
      [
        "globalVariants",
        req.query.globalVariants ? (req.query.componentProps as string) : "[]",
      ],
      ["prepass", req.query.prepass === "1" ? "1" : "0"],
    ]).toString()
  );
}

interface ProjectLoaderProps {
  projectId: string;
  version: string | undefined;
  token: string;
  mgr: DbMgr;
  project: Project;
}

interface ComponentLoaderProps extends ProjectLoaderProps {
  component: string;
}

async function buildLoader(
  req: Request,
  res: Response,
  versionType: "preview" | "versioned",
  platform: "html" | "repr-v2" | "repr-v3",
  componentRequired: true,
  func: (props: ComponentLoaderProps) => Promise<void>
): Promise<void>;
async function buildLoader(
  req: Request,
  res: Response,
  versionType: "preview" | "versioned",
  platform: "html" | "repr-v2" | "repr-v3",
  componentRequired: false,
  func: (props: ProjectLoaderProps) => Promise<void>
): Promise<void>;
async function buildLoader(
  req: Request,
  res: Response,
  versionType: "preview" | "versioned",
  platform: "html" | "repr-v2" | "repr-v3",
  componentRequired: boolean,
  func:
    | ((props: ProjectLoaderProps) => Promise<void>)
    | ((props: ComponentLoaderProps) => Promise<void>)
): Promise<void> {
  const mgr = userDbMgr(req);
  const projectIdSpec = req.params.projectId as string | undefined;
  const component = req.params.component as string | undefined;

  if (!projectIdSpec) {
    throw new BadRequestError(`A projectId was not specified`);
  }

  if (componentRequired && !component) {
    throw new BadRequestError(`A component name was not specified`);
  }

  const { projectId, version, tag } = parseProjectIdSpec(projectIdSpec);
  const versionOrTag = version ?? tag;

  if (!version && versionType !== "preview") {
    throw new BadRequestError(
      `Project ${projectId} does not have specified version`
    );
  }

  const token = mgr.projectIdsAndTokens?.find(
    (p) => p.projectId === projectId
  )?.projectApiToken;
  if (!token) {
    throw new BadRequestError(`No project token specified for ${projectId}`);
  }

  await mgr.checkProjectPerms(projectId, "viewer", "get");

  const project = await mgr.getProjectById(projectId);

  if (versionType === "preview") {
    const projectRev = (
      await resolveLatestProjectRevisions(mgr, [
        { id: projectId, branchName: versionOrTag },
      ])
    )[projectId];
    const prefix = `${LOADER_CACHE_BUST}-${projectId}@${projectRev}`;
    const suffix = component ? `-${normComponentName(component)}` : "";
    const etag = `W/${prefix}${suffix}`;

    if (checkEtagSkippable(req, res, etag)) {
      return;
    }
  }

  trackLoaderCodegenEvent(req, [project], {
    versionType,
    platform,
  });
  req.promLabels.projectId = projectId;

  await func({
    projectId,
    component: hackyCast(component),
    version: versionOrTag,
    token,
    mgr,
    project,
  });
}

export async function genLoaderHtmlBundleSandboxed(
  args: Parameters<typeof genLoaderHtmlBundle>[0]
) {
  const cmd = `node -r esbuild-register src/wab/server/loader/gen-html-bundle.ts`;
  const { stdout, stderr, exitCode } =
    process.env.DISABLE_BWRAP === "1"
      ? await execa(
          "node",
          [...cmd.split(/\s+/g).slice(1), JSON.stringify(args)],
          { reject: false }
        )
      : await execa(
          `bwrap`,
          [
            ...`--clearenv --setenv CODEGEN_HOST ${getCodegenUrl()} --unshare-user --unshare-pid --unshare-ipc --unshare-uts --unshare-cgroup --ro-bind /lib /lib --ro-bind /usr /usr --ro-bind /etc /etc --ro-bind /run /run ${
              process.env.BWRAP_ARGS || ""
            } --chdir ${process.cwd()} ${cmd}`.split(/\s+/g),
            JSON.stringify(args),
          ],
          { reject: false }
        );
  if (stderr.trim().length > 0 && exitCode === 0) {
    console.error(
      `Sandboxed loader subprocess succeeded with exit code 0 but got unexpected stderr:\n` +
        stderr
    );
  } else if (exitCode !== 0) {
    console.error(
      `Sandboxed loader subprocess failed with exit code ${exitCode} with stderr:\n` +
        stderr
    );
  }
  return { html: stdout };
}

export async function buildVersionedLoaderHtml(req: Request, res: Response) {
  return buildLoader(req, res, "versioned", "html", true, async (props) => {
    const prepass = req.query.prepass === "1";
    const maxAge = prepass ? +(req.query.maxAge ?? "3600") : undefined;

    const result = await genLoaderHtmlBundleSandboxed({
      projectId: props.projectId,
      component: props.component,
      version: props.version,
      embedHydrate: req.query.embedHydrate === "1",
      hydrate: req.query.hydrate === "1",
      prepass,
      projectToken: props.token,
      componentProps: parseComponentProps(req.query.componentProps),
      globalVariants: parseGlobalVariants(req.query.globalVariants),
    });

    await props.mgr.upsertLoaderPublishmentEntities({
      projectIds: [props.projectId],
      platform: "react",
      loaderVersion: LATEST_LOADER_VERSION,
      browserOnly: false,
      i18nKeyScheme: undefined,
      i18nTagPrefix: undefined,
      appDir: false,
    });

    setAsCacheableResource(res, maxAge);
    res.json(result);
  });
}

export async function buildLatestLoaderHtml(req: Request, res: Response) {
  return await buildLoader(req, res, "preview", "html", true, async (props) => {
    const { projectId, component } = props;

    const result = await genLoaderHtmlBundleSandboxed({
      projectId,
      component,
      embedHydrate: req.query.embedHydrate === "1",
      hydrate: req.query.hydrate === "1",
      prepass: req.query.prepass === "1",
      projectToken: props.token,
      componentProps: parseComponentProps(req.query.componentProps),
      globalVariants: parseGlobalVariants(req.query.globalVariants),
    });
    res.json(result);
  });
}

async function genReprV2(
  req: Request,
  res: Response,
  props: ProjectLoaderProps
) {
  const { projectId, project } = props;

  const mgr = superDbMgr(req);

  const bundler = new Bundler();
  const { site } = await mgr.tryGetPkgVersionByProjectVersionOrTag(
    bundler,
    projectId,
    props.version || "latest"
  );

  const componentReprs = site.components.map((c) =>
    tuple(c.name, tplToPlasmicElements(c.tplTree))
  );

  res.json({ site: { components: Object.fromEntries(componentReprs) } });
}

async function genReprV3(
  req: Request,
  res: Response,
  props: ProjectLoaderProps
) {
  const { projectId } = props;

  const mgr = superDbMgr(req);

  const bundler = new Bundler();
  const { site } = await mgr.tryGetPkgVersionByProjectVersionOrTag(
    bundler,
    projectId,
    props.version || "latest"
  );

  res.json({ site: toJson(site, bundler) });
}

async function buildPublishedLoaderRedirect(
  req: Request,
  res: Response,
  loaderType: `repr-v2` | `repr-v3` | `html`,
  componentRequired: boolean,
  query: string
) {
  const mgr = userDbMgr(req);
  const projectIdSpec = req.params.projectId as string | undefined;
  const component = req.params.component as string | undefined;

  if (!projectIdSpec) {
    throw new BadRequestError(`A projectId was not specified`);
  }

  if (componentRequired && !component) {
    throw new BadRequestError(`A component name was not specified`);
  }

  const resolvedProjectIdSpec = (
    await getResolvedProjectVersions(mgr, [projectIdSpec], {
      prefilledOnly: true,
    })
  )[0];

  req.promLabels.projectId = projectIdSpec;

  // Make sure we don't cache redirects
  redirectToCacheableResource(
    res,
    `/api/v1/loader/${loaderType}/versioned/${resolvedProjectIdSpec}${
      component ? "/" + normComponentName(component) : ""
    }?${query}`
  );
}

export async function buildPublishedLoaderReprV2(req: Request, res: Response) {
  return buildPublishedLoaderRedirect(
    req,
    res,
    "repr-v2",
    true,
    new URLSearchParams([["cb", LOADER_CACHE_BUST]]).toString()
  );
}

export async function buildVersionedLoaderReprV2(req: Request, res: Response) {
  return await buildLoader(
    req,
    res,
    "versioned",
    "repr-v2",
    false,
    async (props) => {
      await genReprV2(req, res, props);
    }
  );
}

export async function buildLatestLoaderReprV2(req: Request, res: Response) {
  return await buildLoader(
    req,
    res,
    "preview",
    "repr-v2",
    false,
    async (props) => {
      await genReprV2(req, res, props);
    }
  );
}

export async function buildPublishedLoaderReprV3(req: Request, res: Response) {
  return buildPublishedLoaderRedirect(
    req,
    res,
    "repr-v3",
    false,
    new URLSearchParams([["cb", LOADER_CACHE_BUST]]).toString()
  );
}

export async function buildVersionedLoaderReprV3(req: Request, res: Response) {
  return await buildLoader(
    req,
    res,
    "versioned",
    "repr-v3",
    false,
    async (props) => {
      await genReprV3(req, res, props);
    }
  );
}

export async function buildLatestLoaderReprV3(req: Request, res: Response) {
  return await buildLoader(
    req,
    res,
    "preview",
    "repr-v3",
    false,
    async (props) => {
      await genReprV3(req, res, props);
    }
  );
}

export async function prefillPublishedLoader(req: Request, res: Response) {
  const pkgVersionId = req.params.pkgVersionId;

  // Don't care about ACLs for pre-filling
  const mgr = superDbMgr(req);

  const pkgVersion = await mgr.getPkgVersionById(pkgVersionId);
  const pkg = await mgr.getPkgById(pkgVersion.pkgId);
  req.promLabels.projectId = pkg.projectId;

  await prefillCloudfront(mgr, req.workerpool, pkgVersionId);

  res.json({});
}

function redirectToCacheableResource(res: Response, destination: string) {
  // We do want to ask cloudfront to cache redirects for us for a short time
  res.setHeader("Cache-Control", "s-maxage=30");
  res.redirect(destination);
}

function setAsCacheableResource(res: Response, maxAge = 31536000) {
  // We set a relatively short max-age, and a long s-maxage (so, the browser
  // doesn't cache much, but cloudfront caches for a long time).  This is
  // because if we discover a bug on the image optimizer, it is easy for us to
  // manually invalidate the cloudfront cache, but we can't do so easily for the
  // browser cache.
  res.setHeader(
    "Cache-Control",
    `max-age=${Math.min(3600, maxAge)}, s-maxage=${maxAge}`
  );
}

export function checkEtagSkippable(req: Request, res: Response, etag: string) {
  if (req.devflags.disableETagCaching) {
    console.log("Etag mechanism is disabled");
    return false;
  }
  if (req.headers["x-plasmic-uptime-check"]) {
    // Never skip uptime checks
    return false;
  }

  // Always set the same ETag, even for 304 Not Modified, so that it'll be used
  // next time as well.
  res.setHeader("ETag", etag);

  // We set a short max-age here so that the browser or cloudfront
  // will try to revalidate via if-none-match first before reusing
  // the cache entry. We used to set no-cache here, but no-cache would
  // disable request collapsing that cloudfront does for simultaneous
  // requests.
  res.setHeader("Cache-Control", "max-age=5");

  if (req.headers["if-none-match"] === etag) {
    // We got a match!  We can skip codegen.
    console.log("Preview request matched!", etag);
    res.status(304);
    res.send();
    return true;
  }
  console.log("Preview request no match", etag, req.headers["if-none-match"]);
  return false;
}

function normComponentName(component: string) {
  return toClassName(component);
}

function trackLoaderCodegenEvent(
  req: Request,
  projects: Project[],
  opts: {
    versionType: "versioned" | "preview" | "chunk";
    platform: string;
  }
) {
  const { versionType, platform } = opts;
  userAnalytics(req).track({
    event: "Codegen",
    properties: {
      newCompScheme: "blackbox",
      projectId: projects.map((p) => p.id).join(","),
      projectName: projects.map((p) => p.name).join(","),
      source: "loader2",
      scheme: "loader2",
      platform,
      versionType,
    },
  });
}

const getHydrationScriptInfo = () => {
  const dir = path.resolve(
    path.join(process.cwd(), "..", "loader-html-hydrate")
  );
  const buildDir = path.join(dir, "build");
  const files = fs.readdirSync(buildDir);
  const filename = files.filter(
    (file) => file.startsWith("loader-") && file.endsWith(".js")
  )[0];

  if (!filename) {
    throw new Error("No hydration script found");
  }

  return {
    dir: buildDir,
    hash: filename.split(".")[1],
    filename,
  };
};

export function getHydrationScript(_: Request, res: Response) {
  res.setHeader("Cache-Control", "maxage=60, s-maxage=60");
  res.redirect(
    `${getCodegenUrl()}/static/js/${getHydrationScriptInfo().filename}`
  );
}

export function getHydrationScriptVersioned(req: Request, res: Response) {
  const { dir, filename, hash } = getHydrationScriptInfo();
  if (hash !== req.params.hash) {
    throw new NotFoundError(
      `Hydration script with hash=${req.params.hash} is unavailable`
    );
  }
  res.setHeader("Cache-Control", "maxage=31536000, s-maxage=31536000");
  res.sendFile(path.join(dir, filename));
}
