import { expect } from "@playwright/test";
import { test } from "../fixtures/test";

test.describe("hostless-react-slick slider carousel", () => {
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

  async function assertState(framed: any, page: any, value: string) {
    await page.waitForTimeout(300);
    const canvasFrame = framed.contentFrame();
    await expect(canvasFrame.getByText(value, { exact: true })).toBeVisible({
      timeout: 8000,
    });
    await page.waitForTimeout(300);
  }

  async function appendSlide(models: any, page: any) {
    await page.waitForTimeout(300);
    await models.studio.frame.getByText("Append new slide").click();
    await page.waitForTimeout(300);
  }

  async function deleteSlide(models: any, page: any) {
    await page.waitForTimeout(300);
    await models.studio.frame.getByText("Delete current slide").click();
    await page.waitForTimeout(300);
  }

  async function clickNext(models: any, page: any) {
    await page.waitForTimeout(300);
    await models.studio.frame.getByText("Next").click();
    await page.waitForTimeout(300);
  }

  test("works", async ({ page, models }) => {
    await models.studio.createNewPageInOwnArena("Homepage");
    const framed = models.studio.frames.first();
    const textId = "slider-current-slide-state-text";
    await page.waitForTimeout(500);

    await models.studio.leftPanel.insertNode("hostless-slider");
    await page.waitForTimeout(500);

    await models.studio.leftPanel.insertNode("Text");
    const htmlAttributesSection = models.studio.frame.locator(
      'text="HTML attributes"'
    );
    await page.waitForTimeout(500);
    await htmlAttributesSection.waitFor({ state: "visible", timeout: 5000 });
    await htmlAttributesSection.evaluate((element) => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    await page.waitForTimeout(300);
    await htmlAttributesSection.click();
    await page.waitForTimeout(500);
    const idField = models.studio.rightPanel.frame
      .locator(
        'div[role="textbox"].templated-string-input[data-slate-editor="true"]'
      )
      .nth(2);

    await idField.waitFor({ state: "visible", timeout: 5000 });
    await idField.evaluate((element) => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    await idField.click();
    await page.waitForTimeout(500);
    await page.keyboard.type(textId);
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const textContentLabel = models.studio.rightPanel.frame.locator(
      `[data-test-id="text-content"] label`
    );
    await textContentLabel.waitFor({ state: "visible", timeout: 5000 });
    await textContentLabel.evaluate((element) => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    await page.waitForTimeout(1000);
    await textContentLabel.hover();
    await page.waitForTimeout(1000);
    await textContentLabel.click({ button: "right" });
    await page.waitForTimeout(1000);
    await models.studio.useDynamicValueButton.click();

    await models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByText("currentSlide")
      .click();

    const saveButton = models.studio.frame.getByRole("button", {
      name: "Save",
    });
    await saveButton.waitFor({ state: "visible" });
    await saveButton.click();

    await models.studio.frame
      .locator(`[data-test-id="data-picker"]`)
      .waitFor({ state: "hidden", timeout: 5000 });

    await assertState(framed, page, "0");

    const outlineButton = models.studio.frame.locator(
      'button[data-test-tabkey="outline"]'
    );
    await outlineButton.click();

    const sliderInTree = models.studio.leftPanel.treeLabels
      .filter({ hasText: "Slider Carousel" })
      .first();
    await sliderInTree.click();

    const initialSlideLabel = models.studio.frame.locator(
      `[data-test-id="prop-editor-row-initialSlide"] label`
    );
    await initialSlideLabel.click({ button: "right", force: true });
    await page.waitForTimeout(500);
    await models.studio.frame.getByText("Use dynamic value").click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.insertMonacoCode(`1`);
    await page.waitForTimeout(500);

    await appendSlide(models, page);
    await assertState(framed, page, "3");

    await appendSlide(models, page);
    await assertState(framed, page, "4");

    await appendSlide(models, page);
    await assertState(framed, page, "5");

    await deleteSlide(models, page);
    await assertState(framed, page, "4");

    await deleteSlide(models, page);
    await appendSlide(models, page);
    await assertState(framed, page, "4");
    await appendSlide(models, page);
    await assertState(framed, page, "5");
    await appendSlide(models, page);
    await assertState(framed, page, "6");
    await deleteSlide(models, page);
    await deleteSlide(models, page);
    await deleteSlide(models, page);
    await assertState(framed, page, "3");
    await deleteSlide(models, page);
    await deleteSlide(models, page);
    await deleteSlide(models, page);
    await deleteSlide(models, page);
    const deleteButton = models.studio.frame.getByText("Delete current slide");
    await expect(deleteButton).not.toBeVisible({ timeout: 5000 });
    await assertState(framed, page, "0");

    await appendSlide(models, page);
    await appendSlide(models, page);
    await appendSlide(models, page);
    await assertState(framed, page, "2");
    await clickNext(models, page);
    await assertState(framed, page, "0");
    await clickNext(models, page);
    await assertState(framed, page, "1");

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.getByText("1", { exact: true })).toBeVisible();
    });
  });
});
