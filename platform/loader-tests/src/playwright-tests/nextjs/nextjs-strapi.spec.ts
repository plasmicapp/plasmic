import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { testStrapiLoader } from "./shared/test-strapi";

test.describe(`NextJS Strapi`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "strapi.json",
      projectName: "Strapi Project",
      removeComponentsPage: true,
    });
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
