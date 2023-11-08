const { merge } = require("webpack-merge");
const webpack = require("webpack");
const baseConfig = require("./webpack.base.config");
const CopyWebpackPlugin = require("copy-webpack-plugin");
module.exports = merge(baseConfig, {
  name: "prod",
  mode: "production",
  entry: {
    client: "./src/index.tsx",
  },
  plugins: [],
  output: {
    filename: "[name].js",
    chunkFilename: "[name].chunk.js",
    path: __dirname + "/public/static/sub/build",
    sourceMapFilename: "[file].map",
    publicPath: "/static/sub/build/",
  },
  devServer: {
    contentBase: ".",
    host: "0.0.0.0",
    publicPath: "/public/static/sub/build/",
    disableHostCheck: true,
  },
});
