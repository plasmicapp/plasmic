/// <reference types="@types/jest" />
import { getEnvVar, LOADER_NEXTJS_VERSIONS_EXHAUSTIVE } from "../env";
import { runCypressTest } from "../test-utils";
import { NextJsContext, setupNextJs, teardownNextJs } from "./nextjs-setup";

describe.each(LOADER_NEXTJS_VERSIONS_EXHAUSTIVE)(
  "Plasmic Website loader-nextjs@$loaderVersion, next@$nextVersion",
  ({ loaderVersion, nextVersion }) => {
    let ctx: NextJsContext;
    beforeAll(async () => {
      ctx = await setupNextJs({
        bundleFile: "plasmic-kit-website-components_16033.json",
        projectName: "PlasmicWebsite",
        npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
        codegenHost: getEnvVar("WAB_HOST"),
        loaderVersion,
        nextVersion,
      });
    });
    afterAll(async () => {
      await teardownNextJs(ctx);
    });

    test("it works", async () => {
      await runCypressTest({
        name: `plasmic-website-nextjs-loader@${loaderVersion}-next@${nextVersion}`,
        spec: "./cypress/e2e/plasmic-website.cy.ts",
        baseUrl: ctx.host,
      });
    });
  }
);
