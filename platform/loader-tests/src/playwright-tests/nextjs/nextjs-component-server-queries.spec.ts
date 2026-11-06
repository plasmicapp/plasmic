import { expect } from "@playwright/test";

import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

/**
 * Slider (query: getResorts) repeats Card (query: getAmenities), which repeats Badge. Both
 * repeats use the default currentItem/currentIndex names, and getAmenities is used by Card only.
 */
test.describe(`NextJS Component Server Queries`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "component-server-queries.json",
      projectName: "Component Server Queries",
      template: "template-app",
      loaderVersion: "latest",
      nextVersion: "16",
      reactVersion: "latest",
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test(`runs component queries on a page without its own query`, async ({
    page,
  }) => {
    const response = await page.goto(`${ctx.host}/component-query-only`);

    const html = await response!.text();
    expect(html).toContain("plasmic-prefetched-server-queries");
    for (const text of ["Resort BRP", "BRP-pool", "SAT-spa"]) {
      expect(html).toContain(text);
      await expect(page.getByText(text)).toBeVisible();
    }
  });

  test(`compiles a page query with nested repeats in a child component`, async ({
    page,
  }) => {
    const response = await page.goto(`${ctx.host}/page-and-component-query`);

    const html = await response!.text();
    for (const text of ["Page query: PAGE", "Resort SBD", "SBD-spa"]) {
      expect(html).toContain(text);
      await expect(page.getByText(text)).toBeVisible();
    }
  });
});
