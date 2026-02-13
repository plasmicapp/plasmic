import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { StrapiMockServer } from "./shared/strapi-mocks";
import { testStrapiLoader } from "./shared/strapi-test";

test.describe(`NextJS Plasmic Strapi`, () => {
  let ctx: NextJsContext;
  let mockServer: StrapiMockServer;

  test.beforeAll(async () => {
    mockServer = new StrapiMockServer();
    await mockServer.start();

    ctx = await setupNextJs({
      bundleFile: "plasmic-strapi.json",
      projectName: "Strapi Project",
      removeComponentsPage: true,
      bundleTransformation: (bundle) =>
        bundle.replaceAll("<REPLACE_WITH_STRAPI_URL>", mockServer.getBaseUrl()),
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
    await mockServer.stop();
  });

  test(`should work with Strapi v4`, async ({ page }) => {
    await testStrapiLoader(page, ctx.host, 4);
  });

  test(`should work with Strapi v5`, async ({ page }) => {
    await testStrapiLoader(page, ctx.host, 5);
  });
});
