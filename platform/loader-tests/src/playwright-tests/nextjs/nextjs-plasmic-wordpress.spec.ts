import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { WordpressMockServer } from "./shared/wordpress-mocks";
import { testWordpressLoader } from "./shared/wordpress-test";

test.describe(`NextJS Plasmic WordPress`, () => {
  let ctx: NextJsContext;
  let mockServer: WordpressMockServer;

  test.beforeAll(async () => {
    mockServer = new WordpressMockServer();
    await mockServer.start();

    ctx = await setupNextJs({
      bundleFile: "plasmic-wordpress.json",
      projectName: "Plasmic WordPress Project",
      removeComponentsPage: true,
      bundleTransformation: (bundle) =>
        bundle.replaceAll(
          "<REPLACE_WITH_WORDPRESS_URL>",
          mockServer.getBaseUrl() + "/"
        ),
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
    await mockServer.stop();
  });

  test(`should work with WordPress posts`, async ({ page }) => {
    await testWordpressLoader(page, ctx.host);
  });
});
