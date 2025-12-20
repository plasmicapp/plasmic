/// <reference types="@types/jest" />
import { runCypressTest } from "../test-utils";
import { HtmlContext, setupHtml, teardownHtml } from "./html-setup";

describe("Plasmic Website", () => {
  let ctx: HtmlContext;
  beforeAll(async () => {
    ctx = await setupHtml({
      bundleFile: "plasmic-kit-website-components_16033.json",
      projectName: "PlasmicWebsite",
    });
  });
  afterAll(async () => {
    await teardownHtml(ctx);
  });

  test("it works", async () => {
    await runCypressTest({
      name: "html",
      spec: "./cypress/e2e/plasmic-website.cy.ts",
      baseUrl: ctx.host,
      env: {
        DYNAMIC: "true",
        DYNAMIC_HTML: "true",

        // TODO: enable this once it's possible to specify component overrides
        // via the Html API
        SKIP_COMPONENTS_TEST: "true",
      },
    });
  });
});
