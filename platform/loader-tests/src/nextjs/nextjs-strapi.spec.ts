/// <reference types="@types/jest" />
import { runCypressTest } from "../test-utils";
import { NextJsContext, setupNextJs, teardownNextJs } from "./nextjs-setup";

/**
 * Skipping for now; our strapi server seems to be down
 */
describe.skip("Plasmic Strapi", () => {
  let ctx: NextJsContext;
  beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "plasmic-strapi.json",
      projectName: "Strapi Project",
      removeComponentsPage: true,
    });
  });
  afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test("it works", async () => {
    await runCypressTest({
      name: `plasmic-strapi-nextjs-loader@latest-next@latest`,
      spec: "./cypress/e2e/plasmic-strapi.cy.ts",
      baseUrl: ctx.host,
    });
  });
});
