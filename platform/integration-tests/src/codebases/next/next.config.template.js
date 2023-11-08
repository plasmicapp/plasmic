const plasmic = require("@plasmicapp/loader/next");
const withPlasmic = plasmic({
  dir: __dirname,
  projects: ["jrK3EHVDvsuNrYohN5Dhrt"],
});

module.exports = withPlasmic({
  reactStrictMode: true,
});
