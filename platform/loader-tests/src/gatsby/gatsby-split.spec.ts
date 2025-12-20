/// <reference types="@types/jest" />
import { runCypressTest } from "../test-utils";
import { GatsbyContext, setupGatsby, teardownGatsby } from "./gatsby-setup";

describe("Plasmic Split", () => {
  let ctx: GatsbyContext;
  beforeAll(async () => {
    ctx = await setupGatsby({
      bundleFile: "plasmic-split-components.json",
      projectName: "Split",
      template: "split",
    });
  });
  afterAll(async () => {
    await teardownGatsby(ctx);
  });

  test("it works", async () => {
    await runCypressTest({
      name: "gatsby",
      spec: "./cypress/e2e/plasmic-split.cy.ts",
      baseUrl: ctx.host,
    });
  });
});
