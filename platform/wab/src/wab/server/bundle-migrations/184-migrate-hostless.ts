import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";

// migrates react-quill, antd5 hostless, plasmic-basic-components, plasmic-graphcms, plasmic-contentful, plasmic-rich-components, commerce-swell, react-slick, react-chartjs-2, commerce-shopify, commerce, plasmic-embed-css, plasmic-chakra-ui, plasmic-nav, react-youtube, airtable, plasmic-strapi, plasmic-tabs, react-scroll-parallax, react-parallax-tilt, react-scroll-parallax-global, lottie-react, plasmic-content-stack, framer-motion, plasmic-shopify, loading-boundary, plasmic-wordpress, antd, react-twitter-widgets, plasmic-query, commerce-saleor, plasmic-sanity-io, react-awesome-reveal, data-table, plasmic-cms
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
