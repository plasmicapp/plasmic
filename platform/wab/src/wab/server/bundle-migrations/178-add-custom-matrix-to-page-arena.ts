import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { Bundler } from "@/wab/shared/bundler";
import { makeComponentArenaCustomMatrix } from "@/wab/shared/component-arenas";
import { ArenaFrameGrid, ArenaFrameRow } from "@/wab/shared/model/classes";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  for (const arena of site.pageArenas) {
    try {
      const newCustomMatrix = makeComponentArenaCustomMatrix(
        site,
        arena.component
      );
      arena.customMatrix = newCustomMatrix;
    } catch (e) {
      // Apparently some page arenas do not have expected screen variants,
      // which was causing this migration to fail to a few projects.
      // https://plasmicapp.sentry.io/issues/4388380037/
      // It's better to have an empty custom matrix than to fail the migration,
      // so projects can be open. Logging so we can see which projects
      // failed in migrate_bundles job.
      arena.customMatrix = new ArenaFrameGrid({
        rows: [
          new ArenaFrameRow({
            rowKey: undefined,
            cols: [],
          }),
        ],
      });
      console.error("Failed to create custom matrix", entity.id);
      console.error(e);
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    bundle.version || "0-new-version"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
