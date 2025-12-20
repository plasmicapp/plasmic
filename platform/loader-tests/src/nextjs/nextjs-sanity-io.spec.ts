/// <reference types="@types/jest" />
import { runCypressTest } from "../test-utils";
import { NextJsContext, setupNextJs, teardownNextJs } from "./nextjs-setup";

describe("Plasmic Sanity", () => {
  let ctx: NextJsContext;
  beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "plasmic-sanity-io.json",
      projectName: "Sanity Project",
      removeComponentsPage: true,
    });
  });
  afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test("it works", async () => {
    await runCypressTest({
      name: `plasmic-sanity-nextjs-loader@latest-next@latest`,
      spec: "./cypress/e2e/plasmic-sanity-io.cy.ts",
      baseUrl: ctx.host,
    });
  });
});
