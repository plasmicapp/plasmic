import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { testContentfulLoader } from "./shared/test-contentful";

test.describe(`NextJS Contentful`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "contentful.json",
      projectName: "Contentful Project",
      removeComponentsPage: true,
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test.skip(`should work with Contentful entries`, async ({ page }) => {
    await testContentfulLoader(page, ctx.host);
  });
});
