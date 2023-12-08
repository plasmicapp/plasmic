import { defineConfig } from "cypress";

export default defineConfig({
  projectId: "vd88vm",
  viewportWidth: 1200,
  viewportHeight: 660,
  defaultCommandTimeout: 15000,
  responseTimeout: 300000,
  chromeWebSecurity: false,
  retries: {
    runMode: 2,
    openMode: 0,
  },
  experimentalMemoryManagement: true,
  numTestsKeptInMemory: 0,
  video: true,
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require("./cypress/plugins/index.ts")(on, config);
    },
    baseUrl: "http://localhost:3003",
    specPattern: "cypress/e2e/**/*.{js,jsx,ts,tsx}",
  },
  reporter: "mocha-reporter-gha",
});
