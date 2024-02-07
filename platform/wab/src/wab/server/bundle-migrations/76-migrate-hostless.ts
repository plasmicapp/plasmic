import {
  BundleMigrationType,
  upgradeHostlessProject,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";

// migrates lottie-react, plasmic-sanity-io, plasmic-wordpress, commerce-shopify, react-youtube, plasmic-embed-css, plasmic-nav, react-slick, plasmic-contentful, react-scroll-parallax-global, commerce-saleor, react-awesome-reveal, framer-motion, commerce-swell, plasmic-graphcms, airtable, plasmic-query, react-twitter-widgets, plasmic-strapi, antd, plasmic-content-stack, react-scroll-parallax, react-parallax-tilt, plasmic-cms, plasmic-basic-components, plasmic-shopify, commerce
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  await upgradeHostlessProject(bundle, entity, db);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
