// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

process.env.NODE_ENV = "test";

const initCypressMousePositionPlugin = require("cypress-mouse-position/plugin");
require("cypress-log-to-output");

const webpack = require("webpack");
const wp = require("@cypress/webpack-preprocessor");
const BlinkDiff = require("blink-diff");
const fs = require("fs");
const path = require("path");

const fetchPolyfill = fs
  .readFileSync(require.resolve("whatwg-fetch"))
  .toString();
const options = wp.defaultOptions;
options.webpackOptions.resolve = {
  extensions: [".ts", ".js"],
  alias: {
    "@": path.resolve(__dirname, "../../src"),
    lodash: "lodash-es",
    http: "stream-http",
    https: "https-browserify",
    os: "os-browserify",
    path: "path-browserify",
    stream: "stream-browserify",
    zlib: "browserify-zlib",
  },
};
options.webpackOptions.module.rules.push({
  test: /\.tsx?$/,
  use: [
    {
      loader: "@sucrase/webpack-loader",
      options: {
        transforms: ["jsx", "typescript"],
      },
    },
  ],
});
options.webpackOptions.plugins = [
  new webpack.ProvidePlugin({
    process: "process/browser.js",
    Buffer: ["buffer", "Buffer"],
  }),
  ...(options.webpackOptions.plugins ?? []),
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
module.exports = (on, config) => {
  // Workaround to set the total window size for Cypress in headless mode or
  // else videos are tiny:
  //
  // https://github.com/cypress-io/cypress/issues/6210
  on("before:browser:launch", (browser, launchOptions) => {
    // This will log console output to jenkins logs. This produces a TON
    // of output and so is disabled by default.  But if you're out of ideas,
    // try it out.
    // launchOptions.args = require("cypress-log-to-output").browserLaunchHandler(
    //   browser,
    //   launchOptions.args
    // );
    if (browser.name === "chrome" && browser.isHeadless) {
      launchOptions.args.push("--window-size=1280,720");
    }
    return launchOptions;
  });

  initCypressMousePositionPlugin(on);

  // Can turn this on to pipe console.log to output. Turning off by
  // default to reduce output (it is very verbose!), but it helps with
  // debugging e2e tests that fail only on CI.
  //
  // Note also that this conflicts with the window sizing workaround above!
  // Only one is activated (whichever one comes last).
  //
  // logToOutputPlugin.install(on);

  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  on("file:preprocessor", wp(options));

  on("after:screenshot", (details) => {
    // If the screenshot was taken with name matching check-X, then we will
    // compare it to a reference screenshot located at screenshot_refs/X (which
    // should exist already).
    if (!details.name || !details.name.startsWith("check-")) {
      return;
    }
    const testImage = details.path;
    const refImage = path.join(
      __dirname,
      "/../screenshotRefs/",
      details.name + ".png"
    );

    console.log(
      "Comparing screenshots:",
      "\ntestImage:",
      testImage,
      "\n refImage:",
      refImage
    );

    if (!fs.existsSync(refImage)) {
      console.log("Reference image doesn't exist.");
      return Promise.reject(false);
    }

    // An alternative image comparison library that seems good is resemblejs
    // https://github.com/HuddleEng/Resemble.js
    const diff = new BlinkDiff({
      imageAPath: refImage,
      imageBPath: testImage,
      thresholdType: BlinkDiff.THRESHOLD_PERCENT,
      threshold: 0.2, // allow 20% of pixels to differ
    });

    return new Promise((resolve, reject) => {
      diff.run((error, result) => {
        if (error) {
          throw error;
        } else {
          if (diff.hasPassed(result.code)) {
            resolve(true);
          } else {
            reject(false);
          }
        }
      });
    });
  });

  on("task", {
    getFetchPolyfill() {
      return fetchPolyfill;
    },
  });
};
