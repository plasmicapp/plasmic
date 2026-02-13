import { expect, Page } from "@playwright/test";
import {
  trackClientFetches,
  waitForPlasmicDynamic,
} from "../../playwright-utils";

/* The test sites for @plasmicpkgs/plasmic-wordpress and @plasmicpkgs/wordpress
 * are functionally identical, so the test body can be shared.
 */
export async function testWordpressLoader(page: Page, host: string) {
  const fetches = trackClientFetches(page);

  await page.goto(`${host}/home`);

  await waitForPlasmicDynamic(page);

  // Check that pages are rendered
  await expect(page.getByText("Sample Page")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Contact Us")).toBeVisible();
  await expect(page.getByText("About Us")).toBeVisible();

  // Check that posts are rendered
  await expect(
    page.getByText("Advanced WordPress Features").first()
  ).toBeVisible();
  await expect(page.getByText("Getting Started with WordPress")).toBeVisible();
  await expect(page.getByText("Hello World").first()).toBeVisible();

  // Navigate to page
  await page.getByText("Sample Page").click();
  await expect(page.getByText("This is an example page").first()).toBeVisible();

  // Navigate to post
  await page.goBack();
  await page.getByText("Advanced WordPress Features").click();
  await expect(
    page.getByText("Learn about advanced WordPress features").first()
  ).toBeVisible();

  // Verify all data was server-rendered
  fetches.assertNone();
}
