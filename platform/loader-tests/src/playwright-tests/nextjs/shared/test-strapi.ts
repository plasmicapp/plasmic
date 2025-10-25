import { expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import imageMap from "../../../../cypress/fixtures/images/strapi/strapi-image-fixtures";
import { waitForPlasmicDynamic } from "../../playwright-utils";

export async function testStrapiLoader(
  page: Page,
  host: string,
  strapiVersion: 4 | 5
) {
  const fixturesPath = path.resolve(__dirname, "../../../../cypress/fixtures");
  const restaurantsData = JSON.parse(
    fs.readFileSync(
      path.join(
        fixturesPath,
        strapiVersion === 4
          ? "strapi-restaurants.json"
          : "strapi-v5-restaurants.json"
      ),
      "utf8"
    )
  );
  const errorData = JSON.parse(
    fs.readFileSync(path.join(fixturesPath, "strapi-error.json"), "utf8")
  );

  await page.route(/restaurants/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(restaurantsData),
    });
  });

  await page.route(/undefined/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(errorData),
    });
  });

  for (const { url, file } of imageMap) {
    const imagePath = path.join(fixturesPath, "images", "strapi", file);
    let imageBuffer;
    try {
      imageBuffer = fs.readFileSync(imagePath);
    } catch {
      imageBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "base64"
      );
    }

    await page.route(url, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: imageBuffer,
      });
    });
  }

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
}
