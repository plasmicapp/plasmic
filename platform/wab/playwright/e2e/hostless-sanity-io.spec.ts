import { expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { test } from "../fixtures/test";

test.describe("hostless-sanity-io", () => {
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    await page.route(/\/production\?query=\*{_type}$/, async (route) => {
      const fixturePath = path.join(
        __dirname,
        "../../cypress/fixtures/sanity-io-all.json"
      );
      const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixtureData),
      });
    });

    await page.route(/screening/, async (route) => {
      const fixturePath = path.join(
        __dirname,
        "../../cypress/fixtures/sanity-io-screening.json"
      );
      const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixtureData),
      });
    });

    await page.route(/movie/, async (route) => {
      const fixturePath = path.join(
        __dirname,
        "../../cypress/fixtures/sanity-io-movies.json"
      );
      const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixtureData),
      });
    });

    const imageUrls = [
      "https://cdn.sanity.io/images/b2gfz67v/production/69ad5d60ff19c456954513e8c67e9563c780d5e1-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/236a8e4d456db62a04f85c39abcfd74c50e0c37b-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/e22a88d23751a84df81f03ef287ae85fc992fe12-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/7aa06723bb01a7a79055b6d6f5be80329a0e5b58-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/60aaeca6580e3bc248678e344fab5d4e5638cc8c-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/222ce0eaef8662485762791f5c31b60ae627e83d-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/c6683ff02881704e326ca8b198af122e18513570-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/5b433475b541fc1f2903d9b281efdde7ac9c28a5-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/fc958a52785af03fea2cf33032b24b72332a5539-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/0a88401628a8205b658f2269a1718542d6a5ac44-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/332ce1adc107e1cd5444369dd88c7fcf78aaa57c-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/a1c52c102311a337b6795e207aaccf967c2b98cc-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/2db1db44ba70003091c0a1dc4c4b5eeb78dde498-780x1170.jpg?w=300",
      "https://cdn.sanity.io/images/b2gfz67v/production/094eaa00429d71f899271fbd223789c323587d7b-780x1170.jpg?w=300",
    ];

    for (let i = 0; i < imageUrls.length; i++) {
      await page.route(imageUrls[i], async (route) => {
        const imagePath = path.join(
          __dirname,
          `../../cypress/fixtures/images/sanity-io/${i + 1}.jpeg`
        );
        const imageData = fs.readFileSync(imagePath);
        await route.fulfill({
          status: 200,
          contentType: "image/jpeg",
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

  test("can put sanity fetcher with sanity field, fetch and show data", async ({
    apiClient,
    page,
    models,
  }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: {
        name: "plasmic-sanity-io",
        npmPkg: ["@plasmicpkgs/plasmic-sanity-io"],
      },
    });
    await page.goto(`/projects/${projectId}`);

    const framed = await models.studio.createNewFrame();
    await models.studio.focusFrameRoot(framed);

    await models.studio.leftPanel.insertNode("SanityFetcher");

    const canvasFrame = models.studio.frames.first().contentFrame();
    await expect(canvasFrame.locator("body")).toContainText(
      "Please specify a valid GROQ query or select a Document type."
    );

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("body")).toContainText(
        "Please specify a valid GROQ query or select a Document type."
      );
    });

    const docTypeButton = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="docType"]'
    );
    await docTypeButton.click();
    await models.studio.rightPanel.frame
      .locator('[role="option"]:has-text("screening")')
      .waitFor({ state: "visible" });
    await models.studio.rightPanel.frame
      .locator('[role="option"]:has-text("screening")')
      .click();

    await expect(canvasFrame.locator("body")).toContainText(
      "Please specify a valid path or select a field."
    );

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("body")).toContainText(
        "Please specify a valid path or select a field."
      );
    });

    const docTypePropRow = models.studio.rightPanel.frame.locator(
      '[data-test-id^="prop-editor-row-"]:has-text("Document type")'
    );
    await docTypePropRow.click({ button: "right" });
    await models.studio.rightPanel.frame
      .locator("text=Remove Document type prop")
      .click();

    const groqInput = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="groq"]'
    );
    await groqInput.click();
    await page.keyboard.type("*[_type == 'movie']");
    await page.keyboard.press("Enter");

    const fieldPlaceholder = canvasFrame
      .locator("div")
      .filter({ hasText: /^Please specify a valid path or select a field\.$/ })
      .first();
    await fieldPlaceholder.waitFor({ state: "visible", timeout: 5000 });
    await fieldPlaceholder.click({ force: true });

    const fieldSelector = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="field"]'
    );
    await fieldSelector.click();
    await models.studio.rightPanel.frame
      .locator('[role="option"]:has-text("title")')
      .waitFor({ state: "visible" });
    await models.studio.rightPanel.frame
      .locator('[role="option"]:has-text("title")')
      .click();

    await expect(canvasFrame.locator("body")).toContainText("WALL·E");

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("body")).toContainText("WALL·E");
    });

    const pathInput = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="path"]'
    );
    await pathInput.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("poster");
    await page.keyboard.press("Enter");

    await models.studio.focusFrameRoot(framed);
    const canvasImages = canvasFrame.locator("img");
    await expect(canvasImages.first()).toHaveAttribute("src", /.+/);

    await models.studio.withinLiveMode(async (liveFrame) => {
      const images = liveFrame.locator(".plasmic_default__div img");
      await expect(images.first()).toHaveAttribute("src", /.+/);
    });

    await models.studio.rightPanel.checkNoErrors();
  });
});
