/// <reference types="@types/jest" />
import { LOADER_NEXTJS_VERSIONS } from "../env";
import { runCypressTest } from "../test-utils";
import { NextJsContext, setupNextJs, teardownNextJs } from "./nextjs-setup";

describe.each(LOADER_NEXTJS_VERSIONS)(
  "Basic components loader-nextjs@$loaderVersion, next@$nextVersion",
  ({ loaderVersion, nextVersion }) => {
    let ctx: NextJsContext;
    beforeAll(async () => {
      ctx = await setupNextJs({
        bundleFile: "plasmic-basic-components-example.json",
        projectName: "Basic Components Example",
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
        name: `basic-components-nextjs-loader@${loaderVersion}-next@${nextVersion}`,
        spec: "./cypress/e2e/plasmic-basic-components.cy.ts",
        baseUrl: ctx.host,
      });
    });
  }
);
