import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

// migrates lottie-react, antd, react-slick, plasmic-content-stack, plasmic-contentful, plasmic-sanity-io, plasmic-cms, react-youtube, react-awesome-reveal, react-scroll-parallax-global, framer-motion, plasmic-basic-components, plasmic-shopify, react-parallax-tilt, react-scroll-parallax, commerce, commerce-shopify, plasmic-strapi, commerce-swell, plasmic-embed-css, plasmic-nav, plasmic-graphcms, airtable, commerce-saleor, plasmic-wordpress, plasmic-query, react-twitter-widgets
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
