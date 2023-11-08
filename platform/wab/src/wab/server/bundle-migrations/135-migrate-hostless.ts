import { upgradeHostlessProject, BundleMigrationType } from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

// migrates antd, react-scroll-parallax, plasmic-nav, antd5 hostless, react-chartjs-2, plasmic-rich-components, plasmic-sanity-io, plasmic-content-stack, plasmic-shopify, commerce-saleor, plasmic-graphcms, plasmic-query, react-parallax-tilt, plasmic-tabs, lottie-react, react-youtube, react-slick, plasmic-basic-components, plasmic-contentful, react-awesome-reveal, airtable, data-table, plasmic-cms, plasmic-wordpress, commerce-shopify, plasmic-strapi, plasmic-embed-css, framer-motion, plasmic-chakra-ui, react-scroll-parallax-global, commerce-swell, react-twitter-widgets, commerce
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
