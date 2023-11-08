const { merge } = require("webpack-merge");
const webpack = require("webpack");
module.exports = {
  entry: {
    client: "./src/index.tsx",
  },
  output: {
    filename: "[name].js",
    path: __dirname + "/dist",
    sourceMapFilename: "[file].map",
  },
  mode: "development",
  // Enable sourcemaps for debugging webpack's output.
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
  },
  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
      { test: /\.tsx?$/, loader: "awesome-typescript-loader" },
      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
    ],
  },
};
