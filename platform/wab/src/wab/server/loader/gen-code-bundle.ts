import { DbMgr } from "@/wab/server/db/DbMgr";
import {
  extractProjectId,
  mkVersionToSync,
  resolveProjectDeps,
  VersionToSync,
} from "@/wab/server/loader/resolve-projects";
import { withSpan } from "@/wab/server/util/apm-util";
import { upsertS3CacheEntry } from "@/wab/server/util/s3-util";
import {
  CachedCodegenOutputBundle,
  ComponentReference,
} from "@/wab/server/workers/codegen";
import { PlasmicWorkerPool } from "@/wab/server/workers/pool";
import { ensureDevFlags } from "@/wab/server/workers/worker-utils";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { ExportOpts, ExportPlatformOptions } from "@/wab/shared/codegen/types";
import { unzip3 } from "@/wab/shared/collections";
import { tuple } from "@/wab/shared/common";
import { LocalizationKeyScheme } from "@/wab/shared/localization";
import { createHash } from "crypto";
import { getConnection } from "typeorm";

/**
 * This is used for busting codegen caches.  You should increment this number if
 * any of our cached codegen responses should be considered _invalid_.  You don't
 * need to increment this if new codegen responses have changed but cached ones are
 * still valid.  Mostly this is for when there is a _bug_ in the generated code.
 *
 * This should be part of any cacheable request as `cb={LOADER_CACHE_BUST}` and as
 * part of the key in our S3 loader cache.
 *
 * Note that incrementing this number is EXPENSIVE and will create a huge volume of
 * codegen requests!  Provision codegen cluster appropriately.
 *
 * 17 - bumped for using shortened css class names
 * 18 - started returning list of component refs in codegen response to handle errors
 * 19 - fix css class name generation
 */
export const LOADER_CACHE_BUST = "19";

/**
 * This represents the version of the loader API wire format; should reflect the
 * latest number noted in Api of loader-core package.  You should bump this number in
 * loader-core and here to reflect any BACKWARDS-INCOMPATIBLE response changes;
 * it will then invalidate the previously cached responses.
 *
 * See past loader versions documented at server/routes/loader.ts. Update that list if
 * you bump this version!
 */
export const LATEST_LOADER_VERSION = 10;

export const LOADER_ASSETS_BUCKET =
  process.env.LOADER_ASSETS_BUCKET ?? "plasmic-loader-assets-dev";

export async function genPublishedLoaderCodeBundle(
  dbMgr: DbMgr,
  pool: PlasmicWorkerPool,
  opts: {
    platform?: string;
    platformOptions: ExportPlatformOptions;
    projectVersions: Record<string, VersionToSync>;
    loaderVersion: number;
    browserOnly: boolean;
    i18nKeyScheme: LocalizationKeyScheme | undefined;
    i18nTagPrefix: string | undefined;
    skipHead?: boolean;
  }
) {
  const { projectVersions } = opts;

  const allProjectVersions = await withSpan(
    "loader-resolve-deps",
    async () => ({
      ...(await resolveProjectDeps(dbMgr, projectVersions)),
      ...projectVersions,
    }),
    `Project versions ${JSON.stringify(projectVersions)}`
  );

  await ensureDevFlags(dbMgr);

  return await genLoaderCodeBundleForProjectVersions(
    dbMgr,
    allProjectVersions,
    pool,
    {
      platform: opts.platform,
      platformOptions: opts.platformOptions,
      loaderVersion: opts.loaderVersion,
      browserOnly: opts.browserOnly,
      mode: "production",
      i18nKeyScheme: opts.i18nKeyScheme,
      i18nTagPrefix: opts.i18nTagPrefix,
      skipHead: opts.skipHead,
    }
  );
}

export async function genLatestLoaderCodeBundle(
  dbMgr: DbMgr,
  pool: PlasmicWorkerPool,
  opts: {
    platform?: string;
    platformOptions: ExportPlatformOptions;
    projectIdsBranches: { id: string; branchName: string | undefined }[];
    loaderVersion: number;
    browserOnly: boolean;
    i18nKeyScheme: LocalizationKeyScheme | undefined;
    i18nTagPrefix: string | undefined;
    skipHead?: boolean;
  }
) {
  const projectIdsBranches = opts.projectIdsBranches;

  const projectVersions = Object.fromEntries(
    projectIdsBranches.map(({ id, branchName }) => {
      return [id, mkVersionToSync(branchName ?? "latest")];
    })
  );

  const allProjectVersions = {
    // Get the resolved deps from seed projectIds
    ...(await resolveProjectDeps(dbMgr, projectVersions)),

    // The seed projectIds themselves should be "latest" or a branchName
    ...projectVersions,
  };

  await ensureDevFlags(dbMgr);

  return await genLoaderCodeBundleForProjectVersions(
    dbMgr,
    allProjectVersions,
    pool,
    {
      platform: opts.platform,
      platformOptions: opts.platformOptions,
      loaderVersion: opts.loaderVersion,
      browserOnly: opts.browserOnly,
      // Use development build for fastest response
      mode: "development",
      i18nKeyScheme: opts.i18nKeyScheme,
      i18nTagPrefix: opts.i18nTagPrefix,
      skipHead: opts.skipHead,
    }
  );
}

async function genLoaderCodeBundleForProjectVersions(
  dbMgr: DbMgr,
  projectVersions: Record<string, VersionToSync>,
  pool: PlasmicWorkerPool,
  opts: {
    platform?: string;
    platformOptions: ExportPlatformOptions;
    mode: "production" | "development";
    loaderVersion: number;
    browserOnly: boolean;
    i18nKeyScheme?: LocalizationKeyScheme;
    i18nTagPrefix: string | undefined;
    skipHead?: boolean;
  }
) {
  const exportOpts: ExportOpts = {
    ...LOADER_CODEGEN_OPTS_DEFAULTS,
    platform: (opts.platform ??
      LOADER_CODEGEN_OPTS_DEFAULTS.platform) as ExportOpts["platform"],
    platformOptions: opts.platformOptions,
    defaultExportHostLessComponents: opts.loaderVersion > 2 ? false : true,
    useComponentSubstitutionApi: opts.loaderVersion >= 6 ? true : false,
    useGlobalVariantsSubstitutionApi: opts.loaderVersion >= 7 ? true : false,
    useCodeComponentHelpersRegistry: opts.loaderVersion >= 10 ? true : false,
    ...(opts.i18nKeyScheme && {
      localization: {
        keyScheme: opts.i18nKeyScheme ?? "content",
        tagPrefix: opts.i18nTagPrefix,
      },
    }),
    skipHead: opts.skipHead,
  };

  const codegenProject = async (
    projectId: string,
    version: string | undefined,
    indirect: boolean
  ) => {
    const res = await pool.exec("codegen", [
      {
        scheme: "blackbox",
        connectionOptions: getConnection().options,
        projectId,
        exportOpts: exportOpts,
        maybeVersionOrTag: version,
        indirect,
        skipChecksums: true,
      },
    ]);

    return tuple(res.output, res.componentDeps, res.componentRefs);
  };

  const [outputBundles, componentDeps, componentRefs] = unzip3(
    await withSpan(
      "loader-codegen",
      async () =>
        await Promise.all(
          Object.entries(projectVersions).map(async ([projectId, v]) => {
            const branches = await dbMgr.listBranchesForProject(
              projectId as ProjectId
            );
            const maybeBranch = branches.find(
              (branch) => branch.name === v.version
            );

            // If version is a branch name, we want to get the latest of that branch
            if (v.version === "latest" || maybeBranch) {
              // If no explicit version, then we cannot cache; just perform the codegen
              return await codegenProject(projectId, v.version, v.indirect);
            } else {
              return await upsertS3CacheEntry<
                [
                  CachedCodegenOutputBundle,
                  Record<string, string[]>,
                  ComponentReference[]
                ]
              >({
                bucket: LOADER_ASSETS_BUCKET,
                key: makeCodegenBucketPath({
                  projectId,
                  version: v.version,
                  indirect: v.indirect,
                  exportOpts,
                }),
                compute: async () =>
                  await codegenProject(projectId, v.version, v.indirect),
                serialize: (obj) => JSON.stringify(obj),
                deserialize: (str) => JSON.parse(str),
              });
            }
          })
        ),
      `Projects ${JSON.stringify({
        ...projectVersions,
        loaderVersion: opts.loaderVersion,
      })}`
    )
  );

  const mergedComponentDeps: Record<string, string[]> = Object.assign(
    {},
    ...componentDeps
  );

  const bundleProjects = async () => {
    return await pool.exec("loader-assets", [
      outputBundles,
      mergedComponentDeps,
      componentRefs.flat(),
      exportOpts.platform,
      {
        mode: opts.mode,
        loaderVersion: opts.loaderVersion,
        browserOnly: opts.browserOnly,
      },
    ]);
  };

  const result = await withSpan(
    "loader-bundle",
    async () => {
      if (
        opts.mode === "production" &&
        (
          await Promise.all(
            Object.entries(projectVersions).map(async ([p, v]) => {
              const branches = await dbMgr.listBranchesForProject(
                p as ProjectId
              );
              const versionIsBranchName = !!branches.find(
                (branch) => branch.name === v.version
              );
              return v.version !== "latest" && !versionIsBranchName;
            })
          )
        ).every((x) => x)
      ) {
        const bundleKey = makeBundleBucketPath({
          projectVersions,
          platform: exportOpts.platform,
          loaderVersion: opts.loaderVersion,
          browserOnly: opts.browserOnly,
          exportOpts,
        });
        const bundle = await upsertS3CacheEntry({
          bucket: LOADER_ASSETS_BUCKET,
          key: bundleKey,
          compute: bundleProjects,
          serialize: (obj) => JSON.stringify(obj),
          deserialize: (str) => JSON.parse(str),
        });
        bundle.bundleKey = bundleKey;
        return bundle;
      } else {
        return await bundleProjects();
      }
    },
    `Projects ${JSON.stringify({
      ...projectVersions,
      loaderVersion: opts.loaderVersion,
    })}`
  );
  return result;
}

export const LOADER_CODEGEN_OPTS_DEFAULTS: ExportOpts = {
  platform: "react",
  lang: "ts",
  relPathFromImplToManagedDir: ".",
  relPathFromManagedToImplDir: ".",
  forceAllProps: false,
  forceRootDisabled: false,
  imageOpts: { scheme: "cdn" },
  stylesOpts: { scheme: "css" },
  codeOpts: { reactRuntime: "classic" },
  fontOpts: { scheme: "none" },
  idFileNames: true,
  codeComponentStubs: true,
  skinnyReactWeb: true,
  importHostFromReactWeb: false,
  skinny: true,
  hostLessComponentsConfig: "package", // Maybe make it configurable
  useComponentSubstitutionApi: false,
  useGlobalVariantsSubstitutionApi: false,
  useCodeComponentHelpersRegistry: false,
  useCustomFunctionsStub: true,
  targetEnv: "loader",
};

function makeCodegenBucketPath(opts: {
  projectId: string;
  version: string;
  // affects whether page components are included; is not indirect, no page components
  indirect: boolean;
  exportOpts: ExportOpts;
}) {
  return `codegen/cb=${LOADER_CACHE_BUST}/pid=${opts.projectId}/v=${
    opts.version
  }/indirect=${opts.indirect}/opts=${makeExportOptsKey(opts.exportOpts)}`;
}

function makeBundleBucketPath(opts: {
  projectVersions: Record<string, VersionToSync>;
  platform: string;
  loaderVersion: number;
  browserOnly: boolean;
  exportOpts: ExportOpts;
}) {
  const projectSpecs = Object.entries(opts.projectVersions)
    .filter(([_, v]) => !v.indirect)
    .map(([p, v]) => `${p}@${v.version}`)
    .sort();
  const key = `bundle/cb=${LOADER_CACHE_BUST}/loaderVersion=${
    opts.loaderVersion
  }/ps=${projectSpecs.join(",")}/platform=${
    opts.platform
  }/browserOnly=${!!opts.browserOnly}/opts=${makeExportOptsKey(
    opts.exportOpts
  )}`;
  return key;
}

export function extractBundleKeyProjectIds(bundleKey: string): ProjectId[] {
  const ps = bundleKey.split("/ps=")[1].split("/")[0];
  return ps.split(",").map(extractProjectId);
}

function makeExportOptsKey(opts: ExportOpts) {
  // We use a hash of the json string to avoid blowing the S3 object
  // key length limit of 1024 chars
  const str = JSON.stringify(opts);
  return createHash("sha256").update(str).digest("hex");
}

export const _testonly = {
  makeBundleBucketPath,
};
