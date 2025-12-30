import { expect, Page } from "@playwright/test";
import { waitForPlasmicDynamic } from "../../playwright-utils";

/* The test sites for @plasmicpkgs/plasmic-cms and @plasmicpkgs/cms
 * are functionally identical, so the test body can be shared.
 */
export async function testCmsLoader(page: Page, host: string) {
  await page.goto(host);

  await waitForPlasmicDynamic(page);

  await expect(page.getByText("First blog post").first()).toBeVisible({
    timeout: 30000,
  });
}
