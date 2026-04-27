import { expect, Page } from "@playwright/test";
import { matchScreenshot, trackClientFetches } from "../../playwright-utils";
interface TestOpts {
  checkTitle: boolean;
  checkSSR: boolean;
}

export async function testHomeRoute(page: Page, host: string, opts: TestOpts) {
  await page.goto(`${host}/home`);

  await expect(page.getByText("First blog post")).toBeVisible();
  await expect(page.getByText("Second blog post")).toBeVisible();
  await expect(page.getByText("Third blog post")).toBeVisible();

  await expect(page.getByText(/Praesent in bibendum felis/)).toBeVisible();
  await expect(
    page.getByText(/Etiam a tortor et ligula ornare pretium/)
  ).toBeVisible();
  await expect(page.getByText("default message")).toBeVisible();

  if (opts.checkTitle) {
    await expect(page).toHaveTitle("Home  |  My Amazing Website");
  }
}

export async function testCms(page: Page, host: string, opts: TestOpts) {
  const fetches = trackClientFetches(page);

  await testHomeRoute(page, host, opts);
  await matchScreenshot(page, "nextjs-cms-home.png");

  // Navigate to a blog post
  await page.getByText("First blog post").first().click();
  await expect(page).toHaveURL(/\/blog\//);

  if (opts.checkTitle) {
    await expect(page).toHaveTitle("First blog post  |  My Amazing Website");
  }

  const pageContent = page.locator('[class*="plasmic_page_wrapper"]');

  await expect(pageContent.getByText("First blog post")).toBeVisible();

  if (opts.checkSSR) {
    // Verify all data was server-rendered
    fetches.assertNone();
  }
}
