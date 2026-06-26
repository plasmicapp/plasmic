import { DbMgr } from "@/wab/server/db/DbMgr";
import { genPublishedLoaderCodeBundle } from "@/wab/server/loader/gen-code-bundle";
import {
  getResolvedProjectVersions,
  mkVersionToSync,
} from "@/wab/server/loader/resolve-projects";
import { logger } from "@/wab/server/observability";
import { makeGenPublishedLoaderCodeBundleOpts } from "@/wab/server/routes/loader";
import { withSpan } from "@/wab/server/util/apm-util";
import { PlasmicWorkerPool } from "@/wab/server/workers/pool";
import { ensureDevFlags } from "@/wab/server/workers/worker-utils";
import { uniqBy } from "lodash";

export async function prefillCloudfront(
  mgr: DbMgr,
  pool: PlasmicWorkerPool,
  pkgVersionId: string
) {
  await ensureDevFlags(mgr);
  const pkgVersion = await mgr.getPkgVersionById(pkgVersionId);
  const pkg = await mgr.getPkgById(pkgVersion.pkgId);
  const projectId = pkg.projectId;
  const loaderPublishmentsRaw = await mgr.getRecentLoaderPublishments(
    projectId
  );
  const loaderPublishments = uniqBy(loaderPublishmentsRaw, (publishment) =>
    [
      publishment.platform,
      publishment.loaderVersion,
      publishment.browserOnly ?? false,
      publishment.i18nKeyScheme,
      publishment.i18nTagPrefix,
      publishment.appDir,
      ...publishment.projectIds,
    ].join(",")
  );

  logger().info(
    `Pre-filling ${projectId}@${pkgVersion.version} for combinations [${loaderPublishments.map(stringifyPublishment).join(", ")}]`
  );

  for (const publishment of loaderPublishments) {
    const comboInfo = stringifyPublishment(publishment);
    try {
      const resolvedProjectIdSpecs = await getResolvedProjectVersions(
        mgr,
        publishment.projectIds
      );

      const label = `Pre-filling combo ${comboInfo} resolvedProjectIds=${JSON.stringify(resolvedProjectIdSpecs)} pkgVersionId=${pkgVersionId}`;

      await withSpan(
        "loader-prefill",
        async () => {
          await genPublishedLoaderCodeBundle(
            mgr,
            pool,
            makeGenPublishedLoaderCodeBundleOpts({
              source: "prefill",
              projectVersions: Object.fromEntries(
                resolvedProjectIdSpecs.map((spec) => {
                  const [pid, version] = spec.split("@");
                  return [pid, mkVersionToSync(version, false)];
                })
              ),
              platform: publishment.platform,
              appDir: publishment.appDir ?? false,
              loaderVersion: publishment.loaderVersion,
              browserOnly: publishment.browserOnly,
              i18n: {
                keyScheme: publishment.i18nKeyScheme ?? undefined,
                tagPrefix: publishment.i18nTagPrefix ?? undefined,
              },
            })
          );
        },
        label
      );
      logger().info(
        `Done pre-filling combo ${comboInfo} resolvedProjectIds=${JSON.stringify(resolvedProjectIdSpecs)}`
      );
    } catch (err) {
      // Even if there was an error, continue with remaining combos and mark
      // as pre-filled at the end, else it'll never be pre-filled.
      logger().error(`Error pre-filling combo ${comboInfo}`, err);
    }
  }
  await mgr.updatePkgVersion(
    pkgVersion.pkgId,
    pkgVersion.version,
    pkgVersion.branchId,
    {
      isPrefilled: true,
    }
  );
}

function stringifyPublishment(p: {
  platform: string;
  loaderVersion: number;
  projectIds: string[];
  browserOnly: boolean | null | undefined;
  i18nKeyScheme: string | null | undefined;
  i18nTagPrefix: string | null | undefined;
  appDir: boolean | null | undefined;
}) {
  return JSON.stringify({
    platform: p.platform,
    loaderVersion: p.loaderVersion,
    projectIds: p.projectIds,
    browserOnly: p.browserOnly ?? false,
    i18nKeyScheme: p.i18nKeyScheme ?? null,
    i18nTagPrefix: p.i18nTagPrefix ?? null,
    appDir: p.appDir ?? null,
  });
}
