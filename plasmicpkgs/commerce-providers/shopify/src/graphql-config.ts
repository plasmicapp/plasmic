import type { CodegenConfig } from "@graphql-codegen/cli";

export const defaultStoreDomain = "next-js-store.myshopify.com";
export const defaultAccessToken = "ef7d41c7bf7e1c214074d0d3047bcd7b";
export const shopifyApiVersion = "2025-01";

const config: CodegenConfig = {
  schema: {
    [`https://${defaultStoreDomain}/api/${shopifyApiVersion}/graphql.json`]: {
      headers: {
        "X-Shopify-Storefront-Access-Token": defaultAccessToken,
      },
    },
  },
  generates: {
    "./src/utils/graphql/gen/": {
      preset: "client",
      presetConfig: {
        fragmentMasking: false,
      },
      config: {
        documentMode: "string",
      },
    },
  },
  documents: [
    "./src/utils/fragments/*.{ts,tsx}",
    "./src/utils/mutations/*.{ts,tsx}",
    "./src/utils/queries/*.{ts,tsx}",
  ],
};

export default config;
