import { getSerializableConnectionOptions } from "@/wab/server/db/DbCon";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { LoaderBundleOutput } from "@/wab/server/loader/module-bundler";
import {
  extractProjectId,
  isPinnedVersionToSync,
  isRevisionToSync,
  makeRevisionSpec,
  mkRevisionToSync,
  mkVersionToSync,
  resolveProjectDeps,
  VersionToSync,
} from "@/wab/server/loader/resolve-projects";
import { logger, withSpan } from "@/wab/server/observability";
import {
  loaderBundleCacheCounter,
  LoaderCacheKind,
  loaderCodegenCacheCounter,
} from "@/wab/server/promstats";
import {
  tryGetS3CacheEntry,
  upsertS3CacheEntry,
} from "@/wab/server/util/s3-util";
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
 * 20 - style token overrides
 * 21 - cached outputs with appDir=true include removed imports
 * 22 - placeholder render modules and css are no longer emitted for non-hostless code components
 * 23 - normalize invalid code component identifiers in loader output
 */
export const LOADER_CACHE_BUST = "23";

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
    source: "prefill" | "live";
    platform?: string;
    platformOptions: ExportPlatformOptions;
    projectVersions: Record<string, VersionToSync>;
    loaderVersion: number;
    browserOnly: boolean;
    i18nKeyScheme: LocalizationKeyScheme | undefined;
    i18nTagPrefix: string | undefined;
    skipHead?: boolean;
  },
) {
  const { projectVersions } = opts;

  const cachedBundle = await tryGetCachedBundle({
    ...opts,
    mode: "production",
    kind: "published",
  });
  if (cachedBundle) {
    return cachedBundle;
  }

  const allProjectVersions = await withSpan(
    "loader-resolve-deps",
    async () => ({
      ...(await resolveProjectDeps(dbMgr, projectVersions)),
      ...projectVersions,
    }),
    `Project versions ${JSON.stringify(projectVersions)}`,
  );

  await ensureDevFlags(dbMgr);

  return await genLoaderCodeBundleForProjectVersions(
    dbMgr,
    allProjectVersions,
    pool,
    {
      source: opts.source,
      platform: opts.platform,
      platformOptions: opts.platformOptions,
      loaderVersion: opts.loaderVersion,
      browserOnly: opts.browserOnly,
      mode: "production",
      kind: "published",
      i18nKeyScheme: opts.i18nKeyScheme,
      i18nTagPrefix: opts.i18nTagPrefix,
      skipHead: opts.skipHead,
    },
  );
}

export async function genRevisionLoaderCodeBundle(
  dbMgr: DbMgr,
  pool: PlasmicWorkerPool,
  opts: {
    source: "live";
    platform?: string;
    platformOptions: ExportPlatformOptions;
    projectRevisions: Record<string, string>;
    loaderVersion: number;
    browserOnly: boolean;
    i18nKeyScheme: LocalizationKeyScheme | undefined;
    i18nTagPrefix: string | undefined;
    skipHead?: boolean;
  },
) {
  const projectVersions: Record<string, VersionToSync> = Object.fromEntries(
    Object.entries(opts.projectRevisions).map(([projectId, revisionId]) => [
      projectId,
      mkRevisionToSync(revisionId),
    ]),
  );

  const cachedBundle = await tryGetCachedBundle({
    ...opts,
    projectVersions,
    mode: "development",
    kind: "revision",
  });
  if (cachedBundle) {
    return cachedBundle;
  }

  const allProjectVersions = await withSpan(
    "loader-resolve-deps",
    async () => ({
      ...(await resolveProjectDeps(dbMgr, projectVersions)),
      ...projectVersions,
    }),
    `Project revisions ${JSON.stringify(opts.projectRevisions)}`,
  );

  await ensureDevFlags(dbMgr);

  return await genLoaderCodeBundleForProjectVersions(
    dbMgr,
    allProjectVersions,
    pool,
    {
      source: opts.source,
      platform: opts.platform,
      platformOptions: opts.platformOptions,
      loaderVersion: opts.loaderVersion,
      browserOnly: opts.browserOnly,
      mode: "development",
      kind: "revision",
      i18nKeyScheme: opts.i18nKeyScheme,
      i18nTagPrefix: opts.i18nTagPrefix,
      skipHead: opts.skipHead,
    },
  );
}

export async function genLatestLoaderCodeBundle(
  dbMgr: DbMgr,
  pool: PlasmicWorkerPool,
  opts: {
    source: "prefill" | "live";
    platform?: string;
    platformOptions: ExportPlatformOptions;
    projectIdsBranches: { id: string; branchName: string | undefined }[];
    loaderVersion: number;
    browserOnly: boolean;
    i18nKeyScheme: LocalizationKeyScheme | undefined;
    i18nTagPrefix: string | undefined;
    skipHead?: boolean;
  },
) {
  const projectIdsBranches = opts.projectIdsBranches;

  const projectVersions = Object.fromEntries(
    projectIdsBranches.map(({ id, branchName }) => {
      return [id, mkVersionToSync(branchName ?? "latest")];
    }),
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
      source: opts.source,
      platform: opts.platform,
      platformOptions: opts.platformOptions,
      loaderVersion: opts.loaderVersion,
      browserOnly: opts.browserOnly,
      // Use development build for fastest response
      mode: "development",
      kind: "preview",
      i18nKeyScheme: opts.i18nKeyScheme,
      i18nTagPrefix: opts.i18nTagPrefix,
      skipHead: opts.skipHead,
    },
  );
}

async function genLoaderCodeBundleForProjectVersions(
  dbMgr: DbMgr,
  projectVersions: Record<string, VersionToSync>,
  pool: PlasmicWorkerPool,
  opts: {
    source: "prefill" | "live";
    platform?: string;
    platformOptions: ExportPlatformOptions;
    mode: "production" | "development";
    kind: LoaderCacheKind;
    loaderVersion: number;
    browserOnly: boolean;
    i18nKeyScheme?: LocalizationKeyScheme;
    i18nTagPrefix: string | undefined;
    skipHead?: boolean;
  },
) {
  const exportOpts = makeExportOpts(opts);

  const codegenProject = async (projectId: string, v: VersionToSync) => {
    const res = await pool.exec("codegen", [
      {
        scheme: "blackbox",
        connectionOptions: getSerializableConnectionOptions(),
        projectId,
        exportOpts: exportOpts,
        maybeVersionOrTag: v.version,
        revisionId: v.revisionId,
        indirect: v.indirect,
        skipChecksums: true,
      },
    ]);

    return tuple(res.output, res.componentDeps, res.componentRefs);
  };

  const listBranches = async (projectId: string, v: VersionToSync) =>
    isRevisionToSync(v)
      ? []
      : await dbMgr.listBranchesForProject(projectId as ProjectId);

  const [outputBundles, componentDeps, componentRefs] = unzip3(
    await withSpan(
      "loader-codegen",
      async () =>
        await Promise.all(
          Object.entries(projectVersions).map(async ([projectId, v]) => {
            const branches = await listBranches(projectId, v);

            if (!isPinnedVersionToSync(v, branches)) {
              // If no explicit version, then we cannot cache; just perform the codegen
              return await codegenProject(projectId, v);
            } else {
              const codegenKey = makeCodegenBucketPath({
                projectId,
                version: v,
                exportOpts,
              });
              const { data: codegenResult, cacheHit: codegenCacheHit } =
                await upsertS3CacheEntry<
                  [
                    CachedCodegenOutputBundle,
                    Record<string, string[]>,
                    ComponentReference[],
                  ]
                >({
                  bucket: LOADER_ASSETS_BUCKET,
                  key: codegenKey,
                  compute: async () => await codegenProject(projectId, v),
                  serialize: (obj) => JSON.stringify(obj),
                  deserialize: (str) => JSON.parse(str),
                });
              loaderCodegenCacheCounter.inc({
                result: codegenCacheHit ? "hit" : "miss",
                source: opts.source,
                kind: opts.kind,
              });
              if (!codegenCacheHit && opts.source === "live") {
                logger.info(
                  `Loader codegen cache miss for live request: ${codegenKey}`,
                );
              }
              return codegenResult;
            }
          }),
        ),
      `Projects ${JSON.stringify({
        ...projectVersions,
        loaderVersion: opts.loaderVersion,
      })}`,
    ),
  );

  const mergedComponentDeps: Record<string, string[]> = Object.assign(
    {},
    ...componentDeps,
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
        (
          await Promise.all(
            Object.entries(projectVersions).map(async ([p, v]) =>
              isPinnedVersionToSync(v, await listBranches(p, v)),
            ),
          )
        ).every((x) => x)
      ) {
        const bundleKey = makeBundleBucketPath({
          projectVersions,
          platform: exportOpts.platform,
          loaderVersion: opts.loaderVersion,
          browserOnly: opts.browserOnly,
          mode: opts.mode,
          exportOpts,
        });
        const { data: bundle, cacheHit: bundleCacheHit } =
          await upsertS3CacheEntry({
            bucket: LOADER_ASSETS_BUCKET,
            key: bundleKey,
            compute: bundleProjects,
            serialize: (obj) => JSON.stringify(obj),
            deserialize: (str) => JSON.parse(str),
          });
        loaderBundleCacheCounter.inc({
          result: bundleCacheHit ? "hit" : "miss",
          source: opts.source,
          kind: opts.kind,
        });
        if (!bundleCacheHit && opts.source === "live") {
          logger.info(
            `Loader bundle cache miss for live request: ${bundleKey}`,
          );
        }
        return withBundleKey(bundle, bundleKey, opts.mode);
      } else {
        return await bundleProjects();
      }
    },
    `Projects ${JSON.stringify({
      ...projectVersions,
      loaderVersion: opts.loaderVersion,
    })}`,
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

/** Indirect dependencies omit page components, so their codegen needs a separate key. */
function makeCodegenBucketPath(opts: {
  projectId: string;
  version: VersionToSync;
  exportOpts: ExportOpts;
}) {
  const { version } = opts;
  const versionPart = isRevisionToSync(version)
    ? `rev=${version.revisionId}`
    : `v=${version.version}`;
  return `codegen/cb=${LOADER_CACHE_BUST}/pid=${
    opts.projectId
  }/${versionPart}/indirect=${version.indirect}/opts=${makeExportOptsKey(
    opts.exportOpts,
  )}`;
}

function makeBundleBucketPath(opts: {
  projectVersions: Record<string, VersionToSync>;
  platform: string;
  loaderVersion: number;
  browserOnly: boolean;
  mode: "production" | "development";
  exportOpts: ExportOpts;
}) {
  const projectSpecs = Object.entries(opts.projectVersions)
    .filter(([_, v]) => !v.indirect)
    .map(([p, v]) =>
      isRevisionToSync(v)
        ? makeRevisionSpec(p, v.revisionId)
        : `${p}@${v.version}`,
    )
    .sort();
  const modePart = opts.mode === "production" ? "" : `/mode=${opts.mode}`;
  const key = `bundle/cb=${LOADER_CACHE_BUST}${modePart}/loaderVersion=${
    opts.loaderVersion
  }/ps=${projectSpecs.join(",")}/platform=${
    opts.platform
  }/browserOnly=${!!opts.browserOnly}/opts=${makeExportOptsKey(
    opts.exportOpts,
  )}`;
  return key;
}

export function isChunkableBundleKey(bundleKey: string) {
  return (
    bundleKey.startsWith("bundle/cb=") &&
    !bundleKey.split("/").includes("..") &&
    !bundleKey.includes("/mode=")
  );
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

/** The subset of the loader options that feed into the codegen `ExportOpts`. */
interface ExportOptsInputs {
  platform?: string;
  platformOptions: ExportPlatformOptions;
  loaderVersion: number;
  i18nKeyScheme?: LocalizationKeyScheme;
  i18nTagPrefix: string | undefined;
  skipHead?: boolean;
}

function makeExportOpts(opts: ExportOptsInputs): ExportOpts {
  return {
    ...LOADER_CODEGEN_OPTS_DEFAULTS,
    platform: (opts.platform ??
      LOADER_CODEGEN_OPTS_DEFAULTS.platform) as ExportOpts["platform"],
    platformOptions: opts.platformOptions,
    useComponentSubstitutionApi: true,
    useGlobalVariantsSubstitutionApi: true,
    useCodeComponentHelpersRegistry: opts.loaderVersion >= 10 ? true : false,
    ...(opts.i18nKeyScheme && {
      localization: {
        keyScheme: opts.i18nKeyScheme ?? "content",
        tagPrefix: opts.i18nTagPrefix,
      },
    }),
    skipHead: opts.skipHead,
  };
}

/** The SDK uses bundleKey to request chunks from the public /chunks route. */
function withBundleKey(
  bundle: LoaderBundleOutput,
  bundleKey: string,
  mode: "production" | "development",
) {
  if (mode === "production") {
    bundle.bundleKey = bundleKey;
  }
  return bundle;
}

/** Probe pinned versions before resolving dependencies or scheduling codegen. */
async function tryGetCachedBundle(
  opts: ExportOptsInputs & {
    source: "prefill" | "live";
    projectVersions: Record<string, VersionToSync>;
    browserOnly: boolean;
    mode: "production" | "development";
    kind: LoaderCacheKind;
  },
): Promise<LoaderBundleOutput | null> {
  const exportOpts = makeExportOpts(opts);
  const bundleKey = makeBundleBucketPath({
    projectVersions: opts.projectVersions,
    platform: exportOpts.platform,
    loaderVersion: opts.loaderVersion,
    browserOnly: opts.browserOnly,
    mode: opts.mode,
    exportOpts,
  });
  const cached = await withSpan("loader-bundle-cache-probe", async () =>
    tryGetS3CacheEntry<LoaderBundleOutput>({
      bucket: LOADER_ASSETS_BUCKET,
      key: bundleKey,
      deserialize: (str) => JSON.parse(str),
    }),
  );
  if (!cached) {
    // Leave the miss to be counted by the upsertS3CacheEntry call downstream,
    // which probes the same key again before computing.
    return null;
  }
  loaderBundleCacheCounter.inc({
    result: "hit",
    source: opts.source,
    kind: opts.kind,
  });
  return withBundleKey(cached, bundleKey, opts.mode);
}

export const _testonly = {
  makeBundleBucketPath,
  makeCodegenBucketPath,
  makeExportOpts,
};
