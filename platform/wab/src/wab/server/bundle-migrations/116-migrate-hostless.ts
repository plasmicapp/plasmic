import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

// migrates lottie-react, plasmic-sanity-io, react-youtube, plasmic-shopify, plasmic-embed-css, commerce-saleor, plasmic-graphcms, data-table, plasmic-cms, plasmic-query, antd, framer-motion, react-scroll-parallax, plasmic-wordpress, react-slick, commerce-shopify, antd5 hostless, plasmic-strapi, react-parallax-tilt, plasmic-chakra-ui, plasmic-basic-components, plasmic-contentful, plasmic-content-stack, react-scroll-parallax-global, plasmic-nav, react-awesome-reveal, plasmic-tabs, commerce-swell, airtable, react-twitter-widgets, commerce
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
