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
    excludeSpecPattern: [
      "cypress/e2e/left-panel.spec.ts",
      "cypress/e2e/00auth.spec.ts",
      "cypress/e2e/arbitrary-css-selectors.spec.ts",
      "cypress/e2e/arena.spec.ts",
      "cypress/e2e/comments.spec.ts",
      "cypress/e2e/component-ops.spec.ts",
      "cypress/e2e/component-props.spec.ts",
      "cypress/e2e/components.spec.ts",
      "cypress/e2e/dynamic-pages-simplified.spec.ts",
      "cypress/e2e/dynamic-pages.spec.ts",
      "cypress/e2e/freestyle.spec.ts",
      "cypress/e2e/generic-slots.spec.ts",
      "cypress/e2e/host-app.spec.ts",
      "cypress/e2e/hostless-antd.spec.ts",
      "cypress/e2e/hostless-antd5.spec.ts",
      "cypress/e2e/hostless-basic-components.spec.ts",
      "cypress/e2e/hostless-cms.spec.ts",
      "cypress/e2e/hostless-code-libs.spec.ts",
      "cypress/e2e/hostless-react-slick-slider-carousel.spec.ts",
      "cypress/e2e/hostless-rich-calendar.spec.ts",
      "cypress/e2e/hostless-rich-layout.spec.ts",
      "cypress/e2e/hostless-rich-table.spec.ts",
      "cypress/e2e/hostless-sanity-io.spec.ts",
      "cypress/e2e/hostless-strapi.spec.ts",
      "cypress/e2e/hostless-tiptap.spec.ts",
      "cypress/e2e/interactions-boolean.spec.ts",
      "cypress/e2e/interactions-conditional-actions.spec.ts",
      "cypress/e2e/interactions-custom.spec.ts",
      "cypress/e2e/interactions-event-handlers.spec.ts",
      "cypress/e2e/interactions-number.spec.ts",
      "cypress/e2e/interactions-objects.spec.ts",
      "cypress/e2e/interactions-text.spec.ts",
      "cypress/e2e/plasmic-hosting.spec.external.ts",
      "cypress/e2e/plasmic-hosting.spec.ts",
      "cypress/e2e/publish.spec.ts",
      "cypress/e2e/rich-text.spec.ts",
      "cypress/e2e/routing-arenas.spec.ts",
      "cypress/e2e/routing-branches.spec.ts",
      "cypress/e2e/antd5/pagination.spec.ts",
      "cypress/e2e/antd5/progress.spec.ts",
      "cypress/e2e/antd5/segmented.spec.ts",
      "cypress/e2e/forms/conversion-between-modes.spec.ts",
      "cypress/e2e/forms/dynamic-initial-value.spec.ts",
      "cypress/e2e/forms/schema.spec.ts",
      "cypress/e2e/forms/simplified-all-form-items.spec.ts",
      "cypress/e2e/forms/simplified.spec.ts",
      "cypress/e2e/image-slots.spec.ts",
      "cypress/e2e/interactions-variants.spec.ts",
      "cypress/e2e/project-access.spec.ts",
      "cypress/e2e/signup.spec.ts",
      "cypress/e2e/stale-bundle.spec.ts",
      "cypress/e2e/state-management-counter.spec.ts",
      "cypress/e2e/state-management-dependent.spec.ts",
      "cypress/e2e/text-slots.spec.ts",
      "cypress/e2e/variants.spec.ts",
      "cypress/e2e/virtual-slots.spec.ts",
    ],
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
  },
  reporter: "mocha-reporter-gha",

  // Since our Cypress tests are quite heavy, avoid restarting tests automatically.
  watchForFileChanges: false,
});
