import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";

// migrates lottie-react, plasmic-sanity-io, react-youtube, plasmic-wordpress, react-awesome-reveal, framer-motion, commerce-swell, commerce-shopify, plasmic-embed-css, plasmic-nav, plasmic-graphcms, airtable, plasmic-query, react-twitter-widgets, react-slick, plasmic-contentful, react-scroll-parallax-global, plasmic-strapi, commerce-saleor, plasmic-cms, antd, plasmic-content-stack, plasmic-basic-components, plasmic-shopify, react-parallax-tilt, react-scroll-parallax, commerce
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
