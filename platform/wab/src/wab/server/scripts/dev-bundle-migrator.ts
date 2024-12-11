import {
  MigrationDbMgr,
  getLastBundleVersion,
  getMigrationsToExecute,
} from "@/wab/server/db/BundleMigrator";
import { flattenDeps } from "@/wab/server/db/DbBundleLoader";
import { unbundleSite } from "@/wab/server/db/bundle-migration-utils";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";
import type { ProjectFullDataResponse } from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import { Bundle } from "@/wab/shared/bundles";
import { assert, maybeOne, spawn } from "@/wab/shared/common";
import { assertSiteInvariants } from "@/wab/shared/site-invariants";
import fs from "fs";
import * as Prettier from "prettier";
import semver from "semver";
import * as uuid from "uuid";

const paths = [
  "src/wab/shared/codegen/__tests__/bundles/todomvc.json",
  "src/wab/shared/codegen/__tests__/bundles/counters-test.json",
  "src/wab/shared/codegen/__tests__/bundles/todoapp.json",
  "src/wab/shared/codegen/__tests__/bundles/form-with-reset-input.json",
  "src/wab/shared/codegen/__tests__/bundles/people-list-explicit-states.json",
  "src/wab/shared/codegen/__tests__/bundles/people-list-implicit-states.json",
  "src/wab/shared/codegen/__tests__/bundles/custom-functions-test.json",
  "src/wab/server/pkg-mgr/data/plume-master-pkg.json",
  "src/wab/server/pkg-mgr/data/plexus-master-pkg.json",
  "cypress/bundles/state-management.json",
  "cypress/bundles/code-libs.json",
  "cypress/bundles/prop-editors.json",
  "cypress/bundles/tutorial-app.json",
  "cypress/bundles/forms.json",
  "../loader-tests/data/antd5/collapse.json",
  "../loader-tests/data/antd5/date-range-picker.json",
  "../loader-tests/data/antd5/popover.json",
  "../loader-tests/data/antd5/rate.json",
  "../loader-tests/data/antd5/slider.json",
  "../loader-tests/data/antd5/tabs.json",
  "../loader-tests/data/antd5/segmented.json",
  "../loader-tests/data/antd5/progress.json",
  "../loader-tests/data/antd5/pagination.json",
  "../loader-tests/data/plasmic-basic-components/timer.json",
  "../loader-tests/data/plasmic-link-preview.json",
  "../loader-tests/data/code-libs.json",
  "../loader-tests/data/app-hosting.json",
  "../loader-tests/data/plasmic-kit-website-components_16033.json",
  "../loader-tests/data/plasmic-website-2023-cypress_12.json",
  "../loader-tests/data/plasmic-app-components.json",
  "../loader-tests/data/plasmic-basic-components-example.json",
  "../loader-tests/data/plasmic-split-components.json",
  "../loader-tests/data/plasmic-sanity-io.json",
  "../loader-tests/data/plasmic-strapi.json",
  "../loader-tests/data/plasmic-cms.json",
  "../loader-tests/data/dynamic-pages.json",
  "../loader-tests/data/plasmic-antd.json",
  "../loader-tests/data/auth-e2e.json",
  "../loader-tests/data/simpler-auth.json",
  "../loader-tests/data/react-quill.json",
  "../loader-tests/data/slick-slider.json",
  "../loader-tests/data/plasmic-antd5.json",
  "../loader-tests/data/data-source-basic.json",
  "src/wab/shared/site-diffs/__tests__/code-components-with-same-name.json",
  "src/wab/shared/site-diffs/__tests__/rich-text-conflict.json",
  "src/wab/shared/site-diffs/__tests__/test-tpl-merge.json",
  "src/wab/shared/site-diffs/__tests__/test-merging-deps.json",
  "src/wab/shared/site-diffs/__tests__/test-edge-cases-merge.json",
  "src/wab/shared/site-diffs/__tests__/test-edge-cases-merge-2.json",
  "src/wab/shared/site-diffs/__tests__/test-reroot.json",
  "src/wab/shared/site-diffs/__tests__/global-context-merge.json",
  "src/wab/shared/site-diffs/__tests__/style-tokens-conflict.json",
  "src/wab/shared/insertable-templates/__tests__/bundles/copy-and-paste.json",
  "src/wab/server/__tests__/bundle-migrations/fixtures/style-variants.migrated.json",
  "src/wab/server/__tests__/bundle-migrations/fixtures/code-component-variants.migrated.json",
];

async function migrate() {
  process.env["DEV_BUNDLE_MIGRATION"] = "true";
  for (const path of paths) {
    /*
      The stale-bundle.json is exempted from migration, because it is used to
      test if the stale bundle (representing very old projects, revived) can be migrated to the latest no matter how old it is.
    */
    assert(
      !path.includes("/stale-bundle.json"),
      () =>
        `The stale bundle should not be migrated here. Please use
          \`yarn db:upgrade-stale-bundle\``
    );
    console.log(`Migrating ${path}`);
    // await execa.command(sh.quote`git checkout ${path}`, {
    //   shell: "bash",
    // });
    const bundleJson = fs.readFileSync(path, { encoding: "utf8" });
    const migratedBundleJson = await migrateInMemory(bundleJson);
    fs.writeFileSync(path, migratedBundleJson);
  }
  console.log("All done!");
  process.exit(0);
}

export async function migrateInMemory(bundleJson: string) {
  // Support both a single bundle or an array with bundles and their IDs
  const maybeBundles = JSON.parse(bundleJson);
  const isProjectWithBranches =
    !Array.isArray(maybeBundles) &&
    !("map" in maybeBundles) &&
    "branches" in maybeBundles;
  let bundles: Record<string, Bundle>;
  if (isProjectWithBranches) {
    const projectData: ProjectFullDataResponse = maybeBundles;
    bundles = Object.fromEntries<Bundle>([
      ...projectData.pkgVersions.map(
        (pkgVersion) => [pkgVersion.id, pkgVersion.data] as const
      ),
      ...projectData.revisions.map((rev) => [rev.branchId, rev.data] as const),
    ]);
  } else {
    bundles = Object.fromEntries<Bundle>(
      Array.isArray(maybeBundles) ? maybeBundles : [["id", maybeBundles]]
    );
  }

  // Our fake DbMgr implementation, with just the minimal necessary to unbundle
  // our bundles
  const db: MigrationDbMgr = {
    getPkgVersionById: async (id: string) => {
      if (!bundles[id]) {
        throw new Error("Unknown id " + id);
      }
      return bundleAsDbEntity(id, bundles[id]) as PkgVersion;
    },
    insertPkgVersion: async (
      pkgId: string,
      version: string,
      model: string,
      tags: string[],
      description: string,
      revisionNum: number
    ) => {
      const newId = uuid.v4();
      const unbundled = JSON.parse(model);
      bundles[newId] = unbundled;
      return bundleAsDbEntity(newId, unbundled) as PkgVersion;
    },
    listPkgVersions: async (pkgId: string) => {
      const pkgBundles = Object.entries(bundles)
        .filter(([id, b]) => b.map[b.root].pkgId === pkgId)
        .sort(([aid, a], [bid, b]) =>
          semver.gt(a.map[a.root].version, b.map[b.root].version) ? -1 : +1
        );
      return pkgBundles.map(([id, b]) => bundleAsDbEntity(id, b) as PkgVersion);
    },
    allowProjectToDataSources: async () => {},
    extendProjectIdAndTokens: async () => {},
    tryGetDevFlagOverrides: async () => undefined,
    isDevBundle: true,
  };

  let migratedSomething = false;

  /**
   * Migrates the argument `bundleId` bundle to the latest version
   */
  const migrateBundle = async (bundleId: string) => {
    const bundle = bundles[bundleId];

    const migrations = await getMigrationsToExecute(bundle.version);
    for (const migration of migrations) {
      console.log(
        `\tMigrating ${bundleId} to ${migration.name}, with deps ${bundle.deps
          .map((d) => `${d}@${bundles[d].version}`)
          .join(", ")}`
      );

      // Make sure all dependencies are migrated first. We have to do this, and
      // not just rely on iterating through each bundle in `bundles`, because
      // new bundles may be getting added due to upgrading hostless packages.
      // See upgradeHostlessProjectForDev().
      for (const dep of bundle.deps) {
        await migrateBundle(dep);
      }
      const entity = bundleAsDbEntity(bundleId, bundle);
      if (migration.type === "bundled") {
        await migration.migrate(bundle, entity);
      } else {
        await migration.migrate(bundle, db, entity);
      }

      bundle.version = migration.name;
      migratedSomething = true;

      // After migration, we need to once again make sure our deps are up-to-date,
      // as it's possible we've upgraded to a new PkgVersion whose bundle version
      // is behind.
      for (const dep of bundle.deps) {
        await migrateBundle(dep);
      }
    }

    bundle.version = await getLastBundleVersion();
  };

  // Migrate each bundle that we know of.
  for (const bundleId of [...Object.keys(bundles)]) {
    await migrateBundle(bundleId);
  }

  // At this point, `bundles` may have more bundles that it started with, because
  // when we run upgradeHostlessProject() on a hostless package, we also create
  // run registerComponent() for that hostless package and create a new bundle
  // for it.  We now want to remove the stale bundles, corresponding to old
  // versions of hostless packages that are no longer in use.
  const pkgIdToMaxVersion: Record<string, [string, Bundle]> = {};
  for (const bundleId of [...Object.keys(bundles)]) {
    const bundle = bundles[bundleId];
    const root = bundleRoot(bundle);
    const site = bundleSite(bundle);
    if (root.__type === "ProjectDependency" && site.hostLessPackageInfo) {
      // This is an imported hostless package!

      const pkgId = root.pkgId;
      const existingVersions = Object.values(bundles)
        .filter(
          (b) =>
            bundleRoot(b).__type === "ProjectDependency" &&
            bundleRoot(b).pkgId === pkgId
        )
        .map((b) => bundleRoot(b).version);
      if (existingVersions.some((v) => semver.gt(v, root.version))) {
        // There exists a newer version! Remove this one
        delete bundles[bundleId];
      } else {
        // This is the latest PkgVersion for this Pkg
        pkgIdToMaxVersion[pkgId] = [bundleId, bundle];
      }
    }
  }

  if (migratedSomething) {
    for (const [bundleId, bundle] of Object.entries(bundles)) {
      console.log(
        `\tTesting bundle ${bundleId}@${bundle.version}, with deps ${bundle.deps
          .map((b) => `${b}@${bundles[b].version}`)
          .join("; ")}`
      );
      const { site } = await unbundleSite(
        new Bundler(),
        bundle,
        db,
        bundleAsDbEntity(bundleId, bundle)
      );
      assertSiteInvariants(site);
    }
  }

  return Prettier.format(
    JSON.stringify(
      isProjectWithBranches
        ? {
            ...maybeBundles,
            pkgVersions: [
              ...maybeBundles.pkgVersions.map((pkgVersion) => {
                const root = bundleRoot(pkgVersion.data);
                if (root.pkgId && root.pkgId in pkgIdToMaxVersion) {
                  // This is a hostless pkgVersion! We replace it with the
                  // upgraded hostless package.
                  const [newBundleId, newBundle] =
                    pkgIdToMaxVersion[root.pkgId];
                  return {
                    ...pkgVersion,
                    id: newBundleId,
                    data: newBundle,
                  };
                } else {
                  return {
                    ...pkgVersion,
                    data: bundles[pkgVersion.id],
                  };
                }
              }),
            ],
            revisions: [
              ...maybeBundles.revisions.map((rev) => ({
                ...rev,
                data: bundles[rev.branchId],
              })),
            ],
          }
        : Array.isArray(maybeBundles)
        ? flattenDeps(
            Object.fromEntries(
              Object.entries(bundles).map(([bid, b]) => [bid, b.deps])
            )
          ).map((bid) => [bid, bundles[bid]])
        : maybeOne([...Object.entries(bundles)])![1]
    ),
    {
      parser: "json",
      trailingComma: "none",
    }
  );
}

function bundleAsDbEntity(id: string, bundle: Bundle) {
  const root = bundleRoot(bundle);
  if (root.__type === "Site") {
    return {
      id,
      data: JSON.stringify(bundle),
    } as ProjectRevision;
  } else {
    return {
      id,
      pkgId: root.pkgId,
      version: root.version,
      model: JSON.stringify(bundle),
    } as PkgVersion;
  }
}

function bundleRoot(bundle: Bundle) {
  return bundle.map[bundle.root];
}

function bundleSite(bundle: Bundle) {
  const root = bundleRoot(bundle);
  if (root.__type === "ProjectDependency") {
    return bundle.map[root.site.__ref];
  } else {
    return root;
  }
}

if (require.main === module) {
  spawn(migrate());
}
