const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turn off React StrictMode for now, as react-aria (used by Plasmic)
  // has some troubles with it. See
  // https://github.com/adobe/react-spectrum/labels/strict%20mode
  reactStrictMode: false,

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,

      // Useful for preventing duplicate React versions when using `yarn link`
      react$: path.resolve("./node_modules/next/dist/compiled/react"),
      "react-dom$": path.resolve("./node_modules/next/dist/compiled/react-dom"),
    };
    return config;
  },
};

module.exports = nextConfig;
