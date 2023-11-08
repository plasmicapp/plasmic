import { upgradeHostlessProject, BundleMigrationType } from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

// migrates plasmic-basic-components, antd5 hostless, loading-boundary, plasmic-rich-components, react-scroll-parallax-global, lottie-react, react-parallax-tilt, plasmic-graphcms, react-scroll-parallax, plasmic-contentful, plasmic-tabs, plasmic-strapi, airtable, plasmic-wordpress, antd, react-twitter-widgets, plasmic-query, plasmic-shopify, framer-motion, commerce-swell, commerce-shopify, commerce-saleor, plasmic-content-stack, plasmic-sanity-io, react-awesome-reveal, react-youtube, plasmic-nav, react-slick, react-chartjs-2, plasmic-chakra-ui, plasmic-embed-css, data-table, plasmic-cms, commerce
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
