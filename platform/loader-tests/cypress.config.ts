import { defineConfig } from "cypress";

export default defineConfig({
  responseTimeout: 60000,
  defaultCommandTimeout: 15000,
  chromeWebSecurity: false,
  video: false,
  retries: {
    runMode: 1,
    openMode: 0,
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require("./cypress/plugins/index.js")(on, config);
    },
    excludeSpecPattern: ["**/__snapshots__/*", "**/__image_snapshots__/*"],
  },
});
