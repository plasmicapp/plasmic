import { expect, Page } from "@playwright/test";
import {
  matchScreenshot,
  trackClientFetches,
  waitForPlasmicDynamic,
} from "../../playwright-utils";

export async function testStrapiLoader(
  page: Page,
  host: string,
  strapiVersion: 4 | 5
) {
  const fetches = trackClientFetches(page);

  await page.goto(`${host}/v${strapiVersion}`);

  await waitForPlasmicDynamic(page);
  // rendered via StrapiField
  await expect(page.getByText("Café Coffee Day").first()).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator("img").first()).toHaveAttribute(
    "src",
    /Cafe_Coffee_Day/
  );
  // rendered via dynamic value
  await expect(page.getByText("Café Coffee Day").nth(1)).toBeVisible();
  await expect(page.locator("img").nth(7)).toHaveAttribute(
    "src",
    /Cafe_Coffee_Day/
  );
  await matchScreenshot(page, `nextjs-strapi-v${strapiVersion}.png`);

  // Verify all data was server-rendered
  fetches.assertNone();
}
