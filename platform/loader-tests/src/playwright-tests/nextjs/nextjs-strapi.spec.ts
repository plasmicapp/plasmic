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

test.describe(`NextJS Strapi`, () => {
  let ctx: NextJsContext;

  test.beforeAll(async () => {
    ctx = await setupNextJs({
      bundleFile: "plasmic-strapi.json",
      projectName: "Strapi Project",
      npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
      codegenHost: getEnvVar("WAB_HOST"),
      removeComponentsPage: true,
    });
  });

  test.afterAll(async () => {
    await teardownNextJs(ctx);
  });

  test(`should work`, async ({ page }) => {
    const fixturesPath = path.resolve(__dirname, "../../../cypress/fixtures");
    const restaurantsData = JSON.parse(
      fs.readFileSync(
        path.join(fixturesPath, "strapi-restaurants.json"),
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

    const imageMapping = [
      {
        url: "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Cafe_Coffee_Day_logo_338419f75a.png",
        file: "Cafe_Coffee_Day_logo.png",
      },
      {
        url: "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Chili_s_Logo_svg_9b74d95e58.png",
        file: "Chili_s_Logo_svg.png",
      },
      {
        url: "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Chipotle_Mexican_Grill_logo_svg_53d34599eb.png",
        file: "Chipotle_Mexican_Grill_logo_svg.png",
      },
      {
        url: "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939374/Big_Smoke_Burger_logo_svg_e3ca76d953.png",
        file: "Big_Smoke_Burger_logo_svg.png",
      },
      {
        url: "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Burger_King_2020_svg_ac8ab9c5f1.png",
        file: "Burger_King_2020_svg.png",
      },
      {
        url: "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Bonchon_Logo_7f7f16bce2.png",
        file: "Bonchon_Logo.png",
      },
      {
        url: "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Buffalo_Wild_Wings_logo_vertical_svg_cc56dc61aa.png",
        file: "Buffalo_Wild_Wings_logo_vertical_svg.png",
      },
    ];

    for (const { url, file } of imageMapping) {
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

    await page.goto(ctx.host);

    await waitForPlasmicDynamic(page);
    await expect(page.getByText("Café Coffee Day").first()).toBeVisible({
      timeout: 30000,
    });

    await expect(page.locator("img").first()).toHaveAttribute("src");
  });
});
