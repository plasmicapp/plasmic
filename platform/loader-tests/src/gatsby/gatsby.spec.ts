/// <reference types="@types/jest" />
import { runCypressTest } from "../test-utils";
import { GatsbyContext, setupGatsby, teardownGatsby } from "./gatsby-setup";

describe("Plasmic Website", () => {
  let ctx: GatsbyContext;
  beforeAll(async () => {
    ctx = await setupGatsby({
      bundleFile: "plasmic-kit-website-components_16033.json",
      projectName: "PlasmicWebsite",
    });
  });
  afterAll(async () => {
    await teardownGatsby(ctx);
  });

  test("it works", async () => {
    await runCypressTest({
      name: "gatsby",
      spec: "./cypress/e2e/plasmic-website.cy.ts",
      baseUrl: ctx.host,
    });
  });
});
