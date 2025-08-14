import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

test.describe.skip("hostless-react-slick slider carousel", () => {
  let projectId: string;
  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "react-slick",
          npmPkg: ["@plasmicpkgs/react-slick", "react-slick", "slick-carousel"],
          cssImport: [
            "slick-carousel/slick/slick-theme.css",
            "slick-carousel/slick/slick.css",
          ],
        },
      ],
    });
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  async function assertState(models: any, page: any, value: string) {
    console.log(`=== Starting assertState, expecting value: "${value}" ===`);

    // Check the Text element in live mode to see if the binding worked
    await models.studio.withinLiveMode(async (liveFrame) => {
      console.log("Entered live mode");

      // Debug: List all elements to see what's available
      const allElements = liveFrame.locator("*[id]");
      const allCount = await allElements.count();
      console.log(`Found ${allCount} elements with id attributes in live mode`);

      for (let i = 0; i < Math.min(10, allCount); i++) {
        const id = await allElements.nth(i).getAttribute("id");
        const text = await allElements.nth(i).textContent();
        console.log(`Element ${i}: id="${id}", text="${text}"`);
      }

      // Look for any element containing "slider" in the ID
      const sliderElements = liveFrame.locator(`[id*="slider"]`);
      const sliderCount = await sliderElements.count();
      console.log(`Found ${sliderCount} elements with "slider" in id`);

      if (sliderCount > 0) {
        const actualText = await sliderElements.first().textContent();
        console.log(`Slider element content: "${actualText}"`);
        await expect(sliderElements.first()).toHaveText(value);
        console.log(
          `✓ State assertion passed: expected "${value}", got "${actualText}"`
        );
      } else {
        console.log("❌ No slider elements found in live mode");
        throw new Error(
          `Could not find text element with slider state. Expected value: ${value}`
        );
      }
    });
  }

  test("works", async ({ page, models }) => {
    await models.studio.createNewFrame().then(async (framed) => {
      await models.studio.focusFrameRoot(framed);
      const textId = "slider-current-slide-state-text";

      await models.studio.insertFromAddDrawer("hostless-slider");
      await page.waitForTimeout(2000);

      await models.studio.insertFromAddDrawer("Text");
      console.log("Inserted Text component");

      await models.studio.addHtmlAttribute("id", textId);
      console.log(`Added HTML attribute id="${textId}"`);

      await models.studio.renameTreeNode("slider-current-slide-state-text");
      console.log("Renamed tree node to slider-current-slide-state-text");

      await models.studio.textContent.click({ button: "right" });
      console.log("Right-clicked on text content");

      await models.studio.useDynamicValueButton.click();
      console.log("Clicked use dynamic value button");

      await models.studio.frame
        .locator(`[data-test-id="data-picker"]`)
        .getByText("currentSlide")
        .click();
      console.log("Selected currentSlide from data picker");

      await models.studio.frame
        .locator(`[data-test-id="data-picker"]`)
        .getByRole("button", { name: "Save" })
        .click();
      console.log("Clicked Save button");

      // Wait a bit for the binding to take effect
      await page.waitForTimeout(1000);
      console.log("Waited for binding to take effect");

      await assertState(models, page, "0");

      // Make sure we're back in the tree tab before selecting
      await models.studio.switchToTreeTab();
      await models.studio.selectTreeNode(["Slider Carousel"]);
      await models.studio.frame
        .locator(`[data-test-id="prop-editor-row-initialSlide"] label`)
        .click({ button: "right" });
      await models.studio.frame.getByText("Use dynamic value").click();
      await models.studio.frame.getByText("Switch to Code").click();
      await models.studio.rightPanel.insertMonacoCode(`1`);

      await models.studio.frame.getByText("Append new slide").click();

      // Wait a bit for the state to update
      await page.waitForTimeout(1000);
      await assertState(models, page, "3");

      await models.studio.frame.getByText("Append new slide").click();
      await assertState(models, page, "4");

      await models.studio.frame.getByText("Append new slide").click();
      await assertState(models, page, "5");

      await models.studio.frame.getByText("Delete current slide").click();
      await assertState(models, page, "4");

      await models.studio.frame.getByText("Delete current slide").click();
      await assertState(models, page, "3");

      await models.studio.frame.getByText("Append new slide").click();
      await models.studio.frame.getByText("Append new slide").click();
      await models.studio.frame.getByText("Append new slide").click();
      await assertState(models, page, "6");

      await models.studio.frame.getByText("Delete current slide").click();
      await models.studio.frame.getByText("Delete current slide").click();
      await models.studio.frame.getByText("Delete current slide").click();
      await assertState(models, page, "3");

      await models.studio.frame.getByText("Delete current slide").click();
      await models.studio.frame.getByText("Delete current slide").click();
      await models.studio.frame.getByText("Delete current slide").click();
      await models.studio.frame.getByText("Delete current slide").click();
      await expect(
        models.studio.frame.getByText("Delete current slide")
      ).not.toBeVisible();
      await assertState(models, page, "0");

      await models.studio.frame.getByText("Append new slide").click();
      await models.studio.frame.getByText("Append new slide").click();
      await models.studio.frame.getByText("Append new slide").click();
      await assertState(models, page, "2");

      await models.studio.frame.getByText("Next").click();
      await assertState(models, page, "0");
      await models.studio.frame.getByText("Next").click();
      await assertState(models, page, "1");

      await models.studio.withinLiveMode(async (liveFrame) => {
        await expect(liveFrame.locator(`#${textId}`)).toHaveText("1");
      });
    });
  });
});
