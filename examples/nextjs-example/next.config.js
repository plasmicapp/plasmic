const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
