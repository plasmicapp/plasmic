import { expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { VERT_CONTAINER_CAP } from "../../src/wab/shared/Labels";
import { test } from "../fixtures/test";

test.describe("hostless-strapi", () => {
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    await page.route("**/*restaurants*", async (route) => {
      if (route.request().url().includes("restaurants-v5")) {
        const fixturePath = path.join(
          __dirname,
          "../../cypress/fixtures/strapi-v5-restaurants.json"
        );
        const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(fixtureData),
        });
      } else {
        const fixturePath = path.join(
          __dirname,
          "../../cypress/fixtures/strapi-restaurants.json"
        );
        const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(fixtureData),
        });
      }
    });

    await page.route(/undefined/, async (route) => {
      const fixturePath = path.join(
        __dirname,
        "../../cypress/fixtures/strapi-error.json"
      );
      const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixtureData),
      });
    });

    const imageMap = {
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Cafe_Coffee_Day_logo_338419f75a.png":
        "images/strapi/Cafe_Coffee_Day_logo.png",
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Chili_s_Logo_svg_9b74d95e58.png":
        "images/strapi/Chili_s_Logo_svg.png",
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Chipotle_Mexican_Grill_logo_svg_53d34599eb.png":
        "images/strapi/Chipotle_Mexican_Grill_logo_svg.png",
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939374/Big_Smoke_Burger_logo_svg_e3ca76d953.png":
        "images/strapi/Big_Smoke_Burger_logo_svg.png",
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Burger_King_2020_svg_ac8ab9c5f1.png":
        "images/strapi/Burger_King_2020_svg.png",
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Bonchon_Logo_7f7f16bce2.png":
        "images/strapi/Bonchon_Logo.png",
      "https://res.cloudinary.com/tubone-plasmic/image/upload/v1650939343/Buffalo_Wild_Wings_logo_vertical_svg_cc56dc61aa.png":
        "images/strapi/Buffalo_Wild_Wings_logo_vertical_svg.png",
    };

    for (const [url, imagePath] of Object.entries(imageMap)) {
      await page.route(url, async (route) => {
        const fullImagePath = path.join(
          __dirname,
          "../../cypress/fixtures/",
          imagePath
        );
        const imageData = fs.readFileSync(fullImagePath);
        await route.fulfill({
          status: 200,
          contentType: imagePath.endsWith(".png")
            ? "image/png"
            : "image/svg+xml",
          body: imageData,
        });
      });
    }
  });

  test.afterEach(async ({ apiClient }) => {
    if (projectId) {
      await apiClient.removeProjectAfterTest(
        projectId,
        "user2@example.com",
        "!53kr3tz!"
      );
    }
  });

  test.describe("can put strapi fetcher with strapi field, fetch and show data", () => {
    async function runTest(version: 4 | 5, { apiClient, page, models }: any) {
      projectId = await apiClient.setupProjectWithHostlessPackages({
        hostLessPackagesInfo: {
          name: "plasmic-strapi",
          npmPkg: ["@plasmicpkgs/plasmic-strapi"],
        },
      });
      await page.goto(`/projects/${projectId}`);

      const framed = await models.studio.createNewFrame();
      await models.studio.focusFrameRoot(framed);

      await models.studio.leftPanel.insertNode("StrapiCollection");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");

      const canvasFrame = models.studio.frames.first().contentFrame();
      await expect(canvasFrame.locator("body")).toContainText(
        "Please specify a collection."
      );

      await models.studio.withinLiveMode(async (liveFrame: any) => {
        await expect(liveFrame.locator("body")).toContainText(
          "Please specify a collection."
        );
      });

      const nameInput = models.studio.rightPanel.frame.locator(
        '[data-plasmic-prop="name"]'
      );
      await nameInput.click();

      await page.keyboard.press("Control+a");
      await page.keyboard.press("Backspace");
      const collectionName = version === 5 ? "restaurants-v5" : "restaurants";
      await page.keyboard.type(collectionName);
      await page.keyboard.press("Enter");

      await expect(canvasFrame.locator("body")).toContainText(
        "StrapiField must specify a field name"
      );

      await models.studio.withinLiveMode(async (liveFrame: any) => {
        await expect(liveFrame.locator("body")).toContainText(
          "StrapiField must specify a field name"
        );
      });

      const fieldPlaceholder = canvasFrame
        .locator("div")
        .filter({
          hasText: /^StrapiField must specify a field name\.$/,
        })
        .first();
      await fieldPlaceholder.click({ force: true });

      const pathSelector = models.studio.rightPanel.frame.locator(
        '[data-plasmic-prop="path"]'
      );
      if ((await pathSelector.count()) > 0) {
        await pathSelector.click();

        const nameOption = models.studio.rightPanel.frame.locator(
          '[role="option"]:has-text("name")'
        );
        await nameOption.waitFor({ state: "visible" });
        await nameOption.click();
      } else {
        throw new Error(
          "Path selector not found after selecting field component"
        );
      }

      await expect(canvasFrame.locator("body")).toContainText(
        "Café Coffee Day"
      );

      await models.studio.withinLiveMode(async (liveFrame: any) => {
        await expect(liveFrame.locator("body")).toContainText(
          "Café Coffee Day"
        );
      });

      const pathSelectorForPhoto = models.studio.rightPanel.frame.locator(
        '[data-plasmic-prop="path"]'
      );
      await pathSelectorForPhoto.click();

      const photoOption = models.studio.rightPanel.frame.locator(
        '[role="option"]:has-text("photo")'
      );
      await photoOption.waitFor({ state: "visible" });
      await photoOption.click();

      await models.studio.focusFrameRoot(framed);
      const canvasImages = canvasFrame.locator("img");
      await expect(canvasImages.first()).toHaveAttribute("src", /.+/);

      await models.studio.withinLiveMode(async (liveFrame: any) => {
        const images = liveFrame.locator(".plasmic_default__div img");
        await expect(images.first()).toHaveAttribute("src", /.+/);
      });

      await models.studio.rightPanel.checkNoErrors();
    }

    test("Strapi v4", async ({ apiClient, page, models }) => {
      await runTest(4, { apiClient, page, models });
    });

    test("Strapi v5", async ({ apiClient, page, models }) => {
      await runTest(5, { apiClient, page, models });
    });
  });

  test.describe("can use context to data bind", () => {
    async function runTest(version: 4 | 5, { apiClient, page, models }: any) {
      projectId = await apiClient.setupProjectWithHostlessPackages({
        hostLessPackagesInfo: {
          name: "plasmic-strapi",
          npmPkg: ["@plasmicpkgs/plasmic-strapi"],
        },
      });
      await page.goto(`/projects/${projectId}`);

      const framed = await models.studio.createNewFrame();
      await models.studio.focusFrameRoot(framed);

      await models.studio.leftPanel.insertNode("StrapiCollection");

      const nameInput = models.studio.rightPanel.frame.locator(
        '[data-plasmic-prop="name"]'
      );
      await nameInput.click();

      await page.keyboard.press("Control+a");
      await page.keyboard.press("Backspace");
      const collectionName = version === 5 ? "restaurants-v5" : "restaurants";
      await page.keyboard.type(collectionName);
      await page.keyboard.press("Enter");

      const canvasFrame = models.studio.frames.first().contentFrame();
      await expect(canvasFrame.locator("body")).toContainText(
        "StrapiField must specify a field name"
      );

      const strapiFieldWithError = canvasFrame
        .locator("div")
        .filter({
          hasText: /^StrapiField must specify a field name\.?$/,
        })
        .first();
      await strapiFieldWithError.click({ force: true });

      await page.keyboard.press("Delete");

      await models.studio.leftPanel.insertNode(VERT_CONTAINER_CAP);

      await models.studio.leftPanel.insertNode("Text");
      await models.studio.renameTreeNode("Product Name");

      const textContentLabel = models.studio.rightPanel.frame.locator(
        '[data-test-id="text-content"] label'
      );
      await textContentLabel.click({ button: "right" });
      await models.studio.frame.getByText("Use dynamic value").click();

      if (version === 5) {
        await models.studio.rightPanel.selectPathInDataPicker([
          "currentStrapiRestaurantsV5Item",
          "name",
        ]);
      } else {
        await models.studio.rightPanel.selectPathInDataPicker([
          "currentStrapiRestaurantsItem",
          "attributes",
          "name",
        ]);
      }

      await models.studio.leftPanel.insertNode("Image");
      const imagePicker = models.studio.rightPanel.frame.locator(
        '[data-test-id="image-picker"]'
      );
      await imagePicker.click({ button: "right" });
      await models.studio.frame.getByText("Use dynamic value").click();

      if (version === 5) {
        await models.studio.rightPanel.selectPathInDataPicker([
          "currentStrapiRestaurantsV5Item",
          "photo",
          "url",
        ]);
      } else {
        await models.studio.rightPanel.selectPathInDataPicker([
          "currentStrapiRestaurantsItem",
          "attributes",
          "photo",
          "data",
          "attributes",
          "url",
        ]);
      }

      await models.studio.withinLiveMode(async (liveFrame: any) => {
        await expect(liveFrame.locator("body")).toContainText(
          "Café Coffee Day"
        );
      });

      await models.studio.rightPanel.checkNoErrors();
    }

    test("Strapi v4", async ({ apiClient, page, models }) => {
      await runTest(4, { apiClient, page, models });
    });

    test("Strapi v5", async ({ apiClient, page, models }) => {
      await runTest(5, { apiClient, page, models });
    });
  });
});
