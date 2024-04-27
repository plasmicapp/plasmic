import { migrate as migrate175 } from "@/wab/server/bundle-migrations/175-refactor-data-model";
import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";

// migrates plasmic-basic-components, lottie-react, react-scroll-parallax-global, react-parallax-tilt, plasmic-graphcms, react-scroll-parallax, plasmic-contentful, plasmic-tabs, plasmic-strapi, airtable, plasmic-shopify, framer-motion, plasmic-content-stack, react-youtube, plasmic-nav, plasmic-chakra-ui, plasmic-embed-css, commerce, plasmic-sanity-io, commerce-saleor, commerce-shopify, react-awesome-reveal, plasmic-query, react-twitter-widgets, antd, plasmic-wordpress, antd5 hostless, react-chartjs-2, react-slick, plasmic-rich-components, data-table, plasmic-cms, loading-boundary, commerce-swell
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await migrate175(bundle, db, entity);
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
