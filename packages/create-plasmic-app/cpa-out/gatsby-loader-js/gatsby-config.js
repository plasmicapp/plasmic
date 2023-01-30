/**
 * @type {import('gatsby').GatsbyConfig}
 */
module.exports = {
  siteMetadata: {
    siteUrl: `https://www.yourdomain.tld`,
  },
  plugins: [{
  resolve: "@plasmicapp/loader-gatsby",
  options: {
    projects: [
      {
        id: "47tFXWjN2C4NyHFGGpaYQ3",
        token: "7BRFratDxPLMGZHnd2grV5QP6mlHcZ1AK3BJSIeh7xzUlHgWh25XpgXvUaKAqHXFMXQQuzpADqboibF6nqNWQ",
      },
    ], // An array of project ids.
    preview: false,
    defaultPlasmicPage: require.resolve("./src/templates/defaultPlasmicPage.jsx"),
  },
},
{
  resolve: "gatsby-plugin-react-helmet",
}
]
}
