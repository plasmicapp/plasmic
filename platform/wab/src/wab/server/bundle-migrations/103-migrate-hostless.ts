import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

// migrates lottie-react, plasmic-sanity-io, react-youtube, plasmic-shopify, plasmic-embed-css, commerce-saleor, framer-motion, plasmic-graphcms, react-scroll-parallax, antd, plasmic-query, plasmic-wordpress, react-slick, data-table, commerce-shopify, plasmic-cms, antd5 hostless, plasmic-basic-components, plasmic-contentful, plasmic-content-stack, react-scroll-parallax-global, plasmic-nav, plasmic-chakra-ui, plasmic-tabs, plasmic-strapi, react-awesome-reveal, commerce-swell, airtable, react-twitter-widgets, react-parallax-tilt, commerce
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
