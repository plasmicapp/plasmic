import type { GatsbyConfig } from "gatsby";
import path from "path";

const config: GatsbyConfig = {
  siteMetadata: {
    title: `plasmic-cms-gatsby`,
    siteUrl: `https://www.yourdomain.tld`,
  },
  // More easily incorporate content into your pages through automatic TypeScript type generation and better GraphQL IntelliSense.
  // If you use VSCode you can also use the GraphQL plugin
  // Learn more at: https://gatsby.dev/graphql-typegen
  graphqlTypegen: true,
  plugins: [
    {
      resolve: "@plasmicapp/loader-gatsby",
      options: {
        projects: [
          {
            id: "bY35SmJJgVeJtcuAReMtgz",
            token:
              "pIa3vWHtSBVjJ69rSmfihVqf5SfLAjoigNd9kUFY5m9FrBkaxuVQxRcq6FQuPDVYcJpKtILIhSYjlxb698A",
          },
        ], // An array of project ids.
        preview: false,
        defaultPlasmicPage: path.resolve(
          "./src/templates/defaultPlasmicPage.tsx"
        ),
      },
    },
    {
      resolve: "gatsby-plugin-react-helmet",
    },
  ],
};

export default config;
