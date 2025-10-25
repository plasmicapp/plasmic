import { expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import imageMap from "../../../loader-tests/cypress/fixtures/images/strapi/strapi-image-fixtures";
import { VERT_CONTAINER_CAP } from "../../src/wab/shared/Labels";
import { test } from "../fixtures/test";

test.describe("hostless-strapi", () => {
  let projectId: string;
  const hostLessPackagesInfo = [
    {
      name: "strapi",
      npmPkg: ["@plasmicpkgs/strapi"],
    },
    {
      name: "plasmic-strapi",
      npmPkg: ["@plasmicpkgs/plasmic-strapi"],
      deps: ["strapi"],
    },
  ];

  test.beforeEach(async ({ page }) => {
    const baseFixturePath = `../../../loader-tests/cypress/fixtures/`;
    await page.route("**/*restaurants*", async (route) => {
      const fixturePath = path.join(
        __dirname,
        baseFixturePath,
        route.request().url().includes("v5")
          ? "strapi-v5-restaurants.json"
          : "strapi-restaurants.json"
      );
      const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixtureData),
      });
    });

    await page.route(/undefined/, async (route) => {
      const fixturePath = path.join(
        __dirname,
        baseFixturePath,
        "strapi-error.json"
      );
      const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixtureData),
      });
    });

    for (const { url, file } of imageMap) {
      await page.route(url, async (route) => {
        const fullImagePath = path.join(
          __dirname,
          baseFixturePath,
          "images",
          "strapi",
          file
        );
        const imageData = fs.readFileSync(fullImagePath);
        await route.fulfill({
          status: 200,
          contentType: file.endsWith(".png") ? "image/png" : "image/svg+xml",
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
        hostLessPackagesInfo,
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
        hostLessPackagesInfo,
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

      // Delete the StrapiField by clicking on it in the canvas
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
