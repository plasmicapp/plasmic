import { defineConfig } from "cypress";

export default defineConfig({
  projectId: "vd88vm",
  viewportWidth: 1200,
  viewportHeight: 660,
  defaultCommandTimeout: 5000,
  responseTimeout: 5000,
  chromeWebSecurity: false,
  retries: {
    runMode: 2,
    openMode: 0,
  },
  experimentalMemoryManagement: true,
  numTestsKeptInMemory: 0,
  video: true,
  e2e: {
    specPattern: "cypress/e2e/**/*.{js,jsx,ts,tsx}",
    // excluding left-panel as it's in a livelock when running in the CI
    excludeSpecPattern: ["cypress/e2e/left-panel.spec.ts"],
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(cypressOn, config) {
      // This is a fix to enable multiple plugins, check https://github.com/bahmutov/cypress-on-fix
      const on = require("cypress-on-fix")(cypressOn);
      // This is a plugin to allow cypress parallel runs for free, check https://github.com/bahmutov/cypress-split?tab=readme-ov-file
      require("cypress-split")(on, config);
      require("./cypress/plugins/index.ts")(on, config);
      // Allows cypress to exit when a test fails if env failFast=true
      require("cypress-fail-fast/plugin")(on, config);

      return config;
    },
    baseUrl: "http://localhost:3003",
    retries: {
      runMode: 3, // Retries when running in CI or `cypress run`
      openMode: 1, // Retries when running interactively in `cypress open`
    },
  },
  reporter: "mocha-reporter-gha",

  // Since our Cypress tests are quite heavy, avoid restarting tests automatically.
  watchForFileChanges: false,
});
