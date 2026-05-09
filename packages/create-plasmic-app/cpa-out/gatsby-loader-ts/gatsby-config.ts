import path from "path";
import type { GatsbyConfig } from "gatsby";

const config: GatsbyConfig = {
  siteMetadata: {
    siteUrl: `https://www.yourdomain.tld`,
  },
  graphqlTypegen: true,
  plugins: [
    {
      resolve: "@plasmicapp/loader-gatsby",
      options: {
        projects: [
          {
            id: "47tFXWjN2C4NyHFGGpaYQ3",
            token: "7BRFratDxPLMGZHnd2grV5QP6mlHcZ1AK3BJSIeh7xzUlHgWh25XpgXvUaKAqHXFMXQQuzpADqboibF6nqNWQ",
          },
        ], // An array of project ids.
        preview: false,
        defaultPlasmicPage: path.resolve("./src/templates/defaultPlasmicPage.tsx"),
      },
    },
    {
      resolve: "gatsby-plugin-react-helmet",
    },
  ],
};

export default config;
