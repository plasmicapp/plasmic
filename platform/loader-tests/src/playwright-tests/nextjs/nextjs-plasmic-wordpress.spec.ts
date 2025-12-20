import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { testWordpressLoader } from "./shared/test-wordpress";

test.describe(`NextJS Plasmic WordPress`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "plasmic-wordpress.json",
      projectName: "Plasmic WordPress Project",
      removeComponentsPage: true,
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test(`should work with WordPress posts`, async ({ page }) => {
    await testWordpressLoader(page, ctx.host);
  });
});
