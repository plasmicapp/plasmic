/// <reference types="@types/jest" />
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../env";
import { runCypressTest } from "../test-utils";
import { NextJsContext, setupNextJs, teardownNextJs } from "./nextjs-setup";

describe.each(LOADER_NEXTJS_VERSIONS)(
  "Plasmic App Hosting loader-nextjs@$loaderVersion, next@$nextVersion",
  ({ loaderVersion, nextVersion }) => {
    let ctx: NextJsContext;
    beforeAll(async () => {
      ctx = await setupNextJs({
        bundleFile: "app-hosting.json",
        projectName: "App Hosting Example",
        npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
        codegenHost: getEnvVar("WAB_HOST"),
        removeComponentsPage: true,
        loaderVersion,
        nextVersion,
      });
    });
    afterAll(async () => {
      await teardownNextJs(ctx);
    });

    test("it works", async () => {
      await runCypressTest({
        name: `app-hosting-nextjs-loader@${loaderVersion}-next@${nextVersion}`,
        spec: "./cypress/e2e/plasmic-app-hosting.cy.ts",
        baseUrl: ctx.host,
      });
    });
  }
);
