const { merge } = require("webpack-merge");
const baseConfig = require("./webpack.base.config");
module.exports = merge(baseConfig, {
  name: "dev",
  entry: {
    client: "./src/index.tsx",
  },
  plugins: [],
  output: {
    filename: "[name].js",
    chunkFilename: "[name].chunk.js",
    path: __dirname + "/public/static/sub/build",
    sourceMapFilename: "maps/[file].map",
    publicPath: "/static/sub/build/",
  },
  devServer: {
    contentBase: ".",
    host: "0.0.0.0",
    publicPath: "/public/static/sub/build/",
    disableHostCheck: true,
  },
});
