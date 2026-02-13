import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { ContentfulMockServer } from "./shared/contentful-mocks";
import { testContentfulLoader } from "./shared/contentful-test";

test.describe(`NextJS Plasmic Contentful`, () => {
  let ctx: NextJsContext;
  let mockServer: ContentfulMockServer;

  test.beforeAll(async () => {
    mockServer = new ContentfulMockServer();
    await mockServer.start();

    ctx = await setupNextJs({
      bundleFile: "plasmic-contentful.json",
      projectName: "Plasmic Contentful Project",
      removeComponentsPage: true,
      env: {
        NEXT_PUBLIC_CONTENTFUL_BASE_URL: mockServer.getBaseUrl(),
      },
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
    await mockServer.stop();
  });

  test(`should work with Contentful entries`, async ({ page }) => {
    await testContentfulLoader(page, ctx.host);
  });
});
