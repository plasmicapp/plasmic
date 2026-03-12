import { LOADER_NEXTJS_TEMPLATES } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { makeEnvName } from "../setup-utils";
import { WordpressMockServer } from "./shared/wordpress-mocks";
import { testWordpressLoader } from "./shared/wordpress-test";

for (const versions of LOADER_NEXTJS_TEMPLATES) {
  test.describe(`NextJS WordPress ${makeEnvName({
    type: "nextjs",
    ...versions,
  })}`, () => {
    let ctx: NextJsContext;
    let mockServer: WordpressMockServer;

    test.beforeAll(async () => {
      mockServer = new WordpressMockServer();
      await mockServer.start();

      ctx = await setupNextJs({
        bundleFile: "wordpress.json",
        projectName: "WordPress Project",
        ...versions,
        removeComponentsPage: true,
        bundleTransformation: (bundle) =>
          bundle.replaceAll(
            "<REPLACE_WITH_WORDPRESS_URL>",
            mockServer.getBaseUrl()
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
}
