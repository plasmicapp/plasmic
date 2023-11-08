import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

// migrates plasmic-sanity-io, plasmic-content-stack, plasmic-shopify, commerce-saleor, plasmic-query, plasmic-tabs, lottie-react, plasmic-contentful, commerce-shopify, react-scroll-parallax-global, commerce-swell, react-twitter-widgets, antd, plasmic-wordpress, framer-motion, react-scroll-parallax, plasmic-graphcms, react-parallax-tilt, react-youtube, plasmic-basic-components, react-awesome-reveal, airtable, plasmic-nav, plasmic-rich-components, antd5 hostless, react-chartjs-2, react-slick, data-table, plasmic-cms, plasmic-strapi, plasmic-embed-css, plasmic-chakra-ui, commerce
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
