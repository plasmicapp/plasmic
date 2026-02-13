import { expect, Page } from "@playwright/test";
import {
  trackClientFetches,
  waitForPlasmicDynamic,
} from "../../playwright-utils";

/* The test sites for @plasmicpkgs/plasmic-contentful and @plasmicpkgs/contentful
 * are functionally identical, so the test body can be shared.
 */
export async function testContentfulLoader(page: Page, host: string) {
  const fetches = trackClientFetches(page);

  // Test home page
  await page.goto(`${host}/home`);
  await waitForPlasmicDynamic(page);

  // Check that the home page title and description are rendered
  await expect(page.getByText("Technology Blog")).toBeVisible({
    timeout: 20000,
  });

  await expect(page.getByText(/technologies for a wide range/i)).toBeVisible();

  // Check that blog links are rendered
  const arBlog = page.getByText("How AR will transform");
  await expect(arBlog).toBeVisible();
  await expect(page.getByText("Humanoids take the stage")).toBeVisible();
  await expect(page.getByText("Exploring the intersection")).toBeVisible();
  await expect(page.getByText("Creating sustainable cities")).toBeVisible();

  // Navigate to a blog post
  await page
    .getByText("How AR will transform our lives in 2050")
    .first()
    .click();
  await expect(page).toHaveURL(
    /\/blog\/how-ar-will-transform-our-lives-in-2050/
  );

  // Check that the blog title, date, author, and content rendered
  await expect(page.getByText("How AR will transform")).toBeVisible();
  await expect(page.getByText(/2022-12-04|December 4, 2022/)).toBeVisible();
  await expect(page.getByText("Livia Dokidis")).toBeVisible();
  await expect(page.getByText(/the most obvious ways that AR/i)).toBeVisible();

  // Verify all data was server-rendered
  fetches.assertNone();
}
