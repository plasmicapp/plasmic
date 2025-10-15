import { expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { getEnvVar } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";
import { waitForPlasmicDynamic } from "../playwright-utils";

test.describe(`NextJS WordPress`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "plasmic-wordpress.json",
      projectName: "WordPress Project",
      npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
      codegenHost: getEnvVar("WAB_HOST"),
      removeComponentsPage: true,
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test(`should work with WordPress posts`, async ({ page }) => {
    const fixturesPath = path.resolve(__dirname, "../../../cypress/fixtures");
    const postsData = JSON.parse(
      fs.readFileSync(path.join(fixturesPath, "wordpress-posts.json"), "utf8")
    );
    const pagesData = JSON.parse(
      fs.readFileSync(path.join(fixturesPath, "wordpress-pages.json"), "utf8")
    );

    // Mock WordPress REST API endpoints
    await page.route(/\/wp-json\/wp\/v2\/posts(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(postsData),
      });
    });

    await page.route(/\/wp-json\/wp\/v2\/pages(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(pagesData),
      });
    });

    await page.goto(`${ctx.host}/home`);

    await waitForPlasmicDynamic(page);

    // Check that pages are rendered
    await expect(page.getByText("Sample Page")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Contact Us")).toBeVisible();
    await expect(page.getByText("About Us")).toBeVisible();

    // Check that posts are rendered
    await expect(
      page.getByText("Advanced WordPress Features").first()
    ).toBeVisible();
    await expect(
      page.getByText("Getting Started with WordPress")
    ).toBeVisible();
    await expect(page.getByText("Hello World").first()).toBeVisible();

    // Navigate to page
    await page.getByText("Sample Page").click();
    await expect(
      page.getByText("This is an example page").first()
    ).toBeVisible();

    // Navigate to post
    await page.goBack();
    await page.getByText("Advanced WordPress Features").click();
    await expect(
      page.getByText("Learn about advanced WordPress features").first()
    ).toBeVisible();
  });
});
