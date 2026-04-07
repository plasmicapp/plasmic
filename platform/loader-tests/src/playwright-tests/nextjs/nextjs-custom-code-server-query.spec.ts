import { expect } from "@playwright/test";

import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

test.describe(`NextJS Custom Code Server Query`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "custom-code-server-query.json",
      projectName: "Custom Code Server Query",
      removeComponentsPage: true,
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test(`should work with arbitrary code in server queries`, async ({
    page,
  }) => {
    // The page has two custom code server queries:
    // 1. "Greeting" — uses data token Planet ("Mars") to produce "Welcome to Mars"
    // 2. "Full Greeting" — depends on $q.greeting.data, appends ", enjoy your stay!"
    // A text element is bound to $q.fullGreeting.data
    const expectedText = "Welcome to Mars, enjoy your stay!";

    const response = await page.goto(`${ctx.host}/page-with-arbitrary-queries`);

    // Verify the content is server-rendered (present in the initial HTML)
    const html = await response!.text();
    expect(html).toContain(expectedText);

    // Also verify it's visible in the browser
    await expect(page.getByText(expectedText)).toBeVisible();
  });
});
