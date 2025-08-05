/// <reference types="@types/jest" />
import { getEnvVar } from "../env";
import { runCypressTest } from "../test-utils";
import { setupCms } from "../utils";
import { NextJsContext, setupNextJs, teardownNextJs } from "./nextjs-setup";

describe("Plasmic CMS", () => {
  let ctx: NextJsContext;
  beforeAll(async () => {
    const cmsDatabase = await setupCms("cms-database-data.json");
    const host = getEnvVar("WAB_HOST");
    ctx = await setupNextJs({
      bundleFile: "plasmic-cms.json",
      projectName: "CMS Project",
      npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
      codegenHost: getEnvVar("WAB_HOST"),
      removeComponentsPage: true,
      bundleTransformation: (bundle) =>
        bundle
          .replace(`<REPLACE_WITH_STUDIO_URL>`, host)
          .replace(`<REPLACE_WITH_CMS_ID>`, cmsDatabase.id)
          .replace(`<REPLACE_WITH_PUBLIC_TOKEN>`, cmsDatabase.publicToken),
    });
  });
  afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test("it works", async () => {
    await runCypressTest({
      name: `plasmic-cms-nextjs-loader@latest-next@latest`,
      spec: "./cypress/e2e/plasmic-cms.cy.ts",
      baseUrl: ctx.host,
    });
  });
});
