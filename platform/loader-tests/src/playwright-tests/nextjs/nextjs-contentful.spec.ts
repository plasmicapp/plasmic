import { LOADER_NEXTJS_TEMPLATES } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { ContentfulMockServer } from "./shared/contentful-mocks";
import { testContentfulLoader } from "./shared/contentful-test";

/**
 * This tests Contentful server queries. The /home page gets a list of blog data, and links to a dynamic
 * /blog/[slug] page. Due to Plasmic link pre-fetching, we have to keep the mock server running throughout the
 * test. We only verify the pages are server rendered by asserting that no client queries occur.
 */
for (const { template, nextVersion } of LOADER_NEXTJS_TEMPLATES) {
  test.describe(`NextJS Contentful ${template}, next@${nextVersion}`, () => {
    let ctx: NextJsContext;
    let mockServer: ContentfulMockServer;

    test.beforeAll(async () => {
      mockServer = new ContentfulMockServer();
      await mockServer.start();

      ctx = await setupNextJs({
        bundleFile: "contentful.json",
        projectName: "Contentful Project",
        template,
        nextVersion,
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
}
