const config = require("./config.json");

module.exports = {
  siteMetadata: {
    siteUrl: "https://www.yourdomain.tld",
    title: "template",
  },
  plugins: [
    {
      resolve: "@plasmicapp/loader-gatsby",
      options: {
        ...config,
        defaultPlasmicPage: require.resolve(
          "./src/templates/defaultPlasmicPage.tsx"
        ),
      },
    },
  ],
};
