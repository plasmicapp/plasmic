/// <reference types="@types/jest" />
import { getEnvVar } from "../env";
import { runCypressTest } from "../test-utils";
import { NextJsContext, setupNextJs, teardownNextJs } from "./nextjs-setup";

describe("Plasmic split", () => {
  let ctx: NextJsContext;
  beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "plasmic-split-components.json",
      projectName: "Split",
      npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
      codegenHost: getEnvVar("WAB_HOST"),
      template: "split",
    });
  });
  afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test("it works", async () => {
    await runCypressTest({
      name: `plasmic-split-nextjs-loader@latest-next@latest`,
      spec: "./cypress/e2e/plasmic-split-nextjs.cy.ts",
      baseUrl: ctx.host,
    });
  });
});
