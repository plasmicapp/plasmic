import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { StrapiMockServer } from "./shared/strapi-mocks";
import { testStrapiLoader } from "./shared/strapi-test";

test.describe(`NextJS Strapi`, () => {
  let ctx: NextJsContext;
  let mockServer: StrapiMockServer;

  test.beforeAll(async () => {
    mockServer = new StrapiMockServer();
    await mockServer.start();

    ctx = await setupNextJs({
      bundleFile: "strapi.json",
      projectName: "Strapi Project",
      removeComponentsPage: true,
      bundleTransformation: (bundle) =>
        bundle.replaceAll(
          "<REPLACE_WITH_STRAPI_URL>",
          mockServer.getBaseUrl() + "/"
        ),
    });
    // We can stop the server here to prove that the generated project statically generates pages/
    // It's not possible in e.g. contentful and wordpress since they have dynamic pages, and we don't
    // currently have a way to customize generateStaticParams in the template.
    await mockServer.stop();
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test(`should work with Strapi v4`, async ({ page }) => {
    await testStrapiLoader(page, ctx.host, 4);
  });

  test(`should work with Strapi v5`, async ({ page }) => {
    await testStrapiLoader(page, ctx.host, 5);
  });
});
