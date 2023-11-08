import { upgradeHostlessProject, BundleMigrationType } from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

// migrates antd, plasmic-rich-components, react-scroll-parallax, plasmic-tabs, plasmic-nav, plasmic-cms, plasmic-chakra-ui, antd5 hostless, commerce
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
