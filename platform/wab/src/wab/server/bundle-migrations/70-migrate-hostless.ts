import { migrate as migration72 } from "@/wab/server/bundle-migrations/72-variant-state-management";
import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";

// migrates react-slick, plasmic-contentful, react-scroll-parallax-global, plasmic-strapi, commerce-saleor, lottie-react, antd, plasmic-content-stack, plasmic-sanity-io, plasmic-cms, react-youtube, react-awesome-reveal, framer-motion, plasmic-basic-components, plasmic-shopify, react-parallax-tilt, react-scroll-parallax, commerce, commerce-swell, commerce-shopify, plasmic-embed-css, plasmic-nav, plasmic-graphcms, airtable, plasmic-wordpress, plasmic-query, react-twitter-widgets
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await migration72(bundle);
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
