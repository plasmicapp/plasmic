import { getEnvVar } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { testContentfulLoader } from "./shared/test-contentful";

test.describe(`NextJS Plasmic Contentful`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "plasmic-contentful.json",
      projectName: "Plasmic Contentful Project",
      npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
      codegenHost: getEnvVar("WAB_HOST"),
      removeComponentsPage: true,
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test(`should work with Contentful entries`, async ({ page }) => {
    await testContentfulLoader(page, ctx.host);
  });
});
