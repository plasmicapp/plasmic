import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";

// migrates antd, plasmic-sanity-io, plasmic-content-stack, react-chartjs-2, plasmic-shopify, commerce-saleor, plasmic-graphcms, data-table, plasmic-cms, plasmic-query, react-scroll-parallax, plasmic-wordpress, commerce-shopify, plasmic-strapi, react-parallax-tilt, plasmic-tabs, lottie-react, react-youtube, plasmic-embed-css, framer-motion, react-slick, antd5 hostless, plasmic-chakra-ui, plasmic-basic-components, plasmic-contentful, react-scroll-parallax-global, plasmic-nav, react-awesome-reveal, commerce-swell, airtable, react-twitter-widgets, commerce
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
