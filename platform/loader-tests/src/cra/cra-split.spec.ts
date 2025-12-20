/// <reference types="@types/jest" />
import { runCypressTest } from "../test-utils";
import { CraContext, setupCra, teardownCra } from "./cra-setup";

describe("Plasmic Website", () => {
  let ctx: CraContext;
  beforeAll(async () => {
    ctx = await setupCra({
      bundleFile: "plasmic-split-components.json",
      projectName: "Split",
      template: "split",
    });
  });
  afterAll(async () => {
    await teardownCra(ctx);
  });

  test("it works", async () => {
    await runCypressTest({
      name: "cra",
      spec: "./cypress/e2e/plasmic-split.cy.ts",
      baseUrl: ctx.host,
      env: {
        DYNAMIC: "true",
      },
    });
  });
});
