import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";

// migrates antd5 hostless, plasmic-sanity-io, plasmic-content-stack, commerce-saleor, plasmic-contentful, commerce-shopify, commerce-swell, framer-motion, react-scroll-parallax, plasmic-graphcms, react-parallax-tilt, react-youtube, plasmic-basic-components, react-awesome-reveal, plasmic-nav, plasmic-shopify, plasmic-query, lottie-react, react-scroll-parallax-global, react-twitter-widgets, antd, plasmic-wordpress, airtable, plasmic-strapi, plasmic-rich-components, react-chartjs-2, plasmic-tabs, react-slick, data-table, plasmic-cms, plasmic-embed-css, plasmic-chakra-ui, commerce
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
