import { migrate as migration65 } from "@/wab/server/bundle-migrations/65-add-comp-style-sections";
import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";

// migrates lottie-react, react-twitter-widgets, antd, react-slick, plasmic-content-stack, plasmic-contentful, plasmic-sanity-io, plasmic-cms, react-youtube, react-awesome-reveal, react-scroll-parallax-global, framer-motion, plasmic-basic-components, plasmic-shopify, react-parallax-tilt, react-scroll-parallax, commerce, commerce-shopify, plasmic-strapi, commerce-swell, plasmic-embed-css, plasmic-nav, plasmic-graphcms, airtable, commerce-saleor, plasmic-wordpress, plasmic-query
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await migration65(bundle, entity);
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
