import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import { goToProject } from "../utils/studio-utils";

const PROJECT_IDS = {
  "loading-boundary": "9Vr5YWkf3w7jj6SsTcCEta",
  "rich-components": "jkU663o1Cz7HrJdwdxhVHk",
  antd5: "ohDidvG9XsCeFumugENU6J",
  base: "gE5G4u5n7anv8KR9zDcgU9",
};

const TUTORIAL_DB_TYPE = "northwind";

test.describe("Table and form tutorial", () => {
  let clonedProjectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    await apiClient.setupProjectFromTemplate("tutorial-app", {
      keepProjectIdsAndNames: true,
      dataSourceReplacement: {
        type: TUTORIAL_DB_TYPE,
      },
    });

    const cloneResult = await apiClient.cloneProject({
      projectId: PROJECT_IDS.base,
    });
    clonedProjectId = cloneResult.projectId;

    await goToProject(page, `/projects/${clonedProjectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    if (clonedProjectId) {
      await apiClient.removeProjectAfterTest(
        clonedProjectId,
        "user2@example.com",
        "!53kr3tz!"
      );
    }

    if (PROJECT_IDS.base) {
      await apiClient.deleteProjectAndRevisions(PROJECT_IDS.base);
    }
  });

  test("can complete tutorial", async ({ page, models }) => {
    const frame = models.studio.frame;

    await expect(
      frame.getByText("The Customer Operations team needs your help! 🚨🚨🚨")
    ).toBeVisible({ timeout: 15_000 });

    await expect(frame.locator("#tour-popup-welcome")).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-part1-intro")).toBeVisible();
    await models.studio.leftPanel.addButton.click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-insert-panel")).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-rich-table-add")).toBeVisible();
    await models.studio.leftPanel.insertNode("hostless-rich-table");
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-data-query-switch-component-tab")
    ).toBeVisible();
    await models.studio.rightPanel.switchToComponentDataTab();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-data-tab")).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-data-query-add")).toBeVisible();
    await frame.locator("#data-queries-add-btn").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-data-query-modal-draft")
    ).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-data-query-modal-preview")
    ).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-data-query-modal-save")
    ).toBeVisible();
    await frame.locator("#data-source-modal-save-btn").click();
    await page.waitForTimeout(700);

    await expect(
      frame.locator("#tour-popup-configure-table-settings-tab")
    ).toBeVisible();
    await models.studio.rightPanel.switchToSettingsTab();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-configure-table")).toBeVisible();

    await frame.locator('[data-test-id="prop-editor-row-data"]').click();
    await frame.locator(`[data-key="'customers'"]`).click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-part1-turn-on-interactive-mode")
    ).toBeVisible();
    await frame.locator("#interactive-canvas-switch").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-part1-turn-off-interactive-mode")
    ).toBeVisible();
    await frame.locator("#interactive-canvas-switch").click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-part2-intro")).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-configure-table-select-rows")
    ).toBeVisible();

    await frame
      .locator('[data-test-id="prop-editor-row-canSelectRows"]')
      .click();
    await frame.locator(`[data-key="'click'"]`).click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-form-open-add-drawer")
    ).toBeVisible();
    await models.studio.leftPanel.addButton.click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-form-add")).toBeVisible();
    await models.studio.leftPanel.insertNode("plasmic-antd5-form");
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-form-items-add")).toBeVisible();
    await frame
      .locator(
        '[data-test-id="prop-editor-row-formItems"] .list-box__add-placeholder'
      )
      .click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-form-items-label")).toBeVisible();

    await frame
      .locator(
        '#object-prop-editor-modal [data-test-id="prop-editor-row-label"]'
      )
      .click();
    await page.keyboard.type("Contact Name");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-form-items-type")).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-form-items-name")).toBeVisible();

    await frame
      .locator(
        '#object-prop-editor-modal [data-test-id="prop-editor-row-name"]'
      )
      .click();
    await page.keyboard.type("contact_name");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-form-items-save")).toBeVisible();
    await frame
      .locator('#sidebar-modal [data-test-id="close-sidebar-modal"]')
      .click();
    await page.waitForTimeout(700);

    await expect(
      frame.locator("#tour-popup-form-items-auto-add")
    ).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-form-initial-values-dynamic-value")
    ).toBeVisible();

    await frame
      .locator('[data-test-id="prop-editor-row-initialValues"]')
      .click({ button: "right" });
    await frame.locator("#use-dynamic-value-btn").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-form-initial-value-data-picker")
    ).toBeVisible();

    await frame
      .locator(
        '[data-test-id="data-picker"] [data-test-id="0-table → selectedRow"]'
      )
      .click();
    await frame.locator("#data-picker-save-btn").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-part2-turn-on-interactive-mode")
    ).toBeVisible();
    await frame.locator("#interactive-canvas-switch").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-part2-turn-off-interactive-mode")
    ).toBeVisible();
    await frame.locator("#interactive-canvas-switch").click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-part3-intro")).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-form-interaction-add")
    ).toBeVisible();
    await frame.locator('[data-test-id="add-interaction"]').click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-form-interaction-on-submit")
    ).toBeVisible();
    await frame.locator("#interactions-select-opt-onFinish").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-form-interaction-use-integration")
    ).toBeVisible();

    await frame.locator('[data-plasmic-prop="action-name"]').click();
    await frame.locator('[data-key="dataSourceOp"]').click();
    await page.waitForTimeout(2500);

    await expect(
      frame.locator("#tour-popup-form-interaction-configure-operation")
    ).toBeVisible();
    await frame.locator("#configure-operation-btn").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-form-interaction-modal-draft")
    ).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-interaction-modal-field-filters")
    ).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-form-interaction-modal-field-updates")
    ).toBeVisible();
    await frame.locator("#tour-primary-btn").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-interaction-modal-save-btn")
    ).toBeVisible();
    await frame.locator("#data-source-modal-save-btn").click();
    await page.waitForTimeout(700);

    await expect(
      frame.locator("#tour-popup-part3-turn-on-interactive-mode")
    ).toBeVisible();
    await frame.locator("#interactive-canvas-switch").click();
    await page.waitForTimeout(300);

    await expect(
      frame.locator("#tour-popup-part3-turn-off-interactive-mode")
    ).toBeVisible();
    await frame.locator("#interactive-canvas-switch").click();
    await page.waitForTimeout(300);

    await expect(frame.locator("#tour-popup-open-publish-modal")).toBeVisible();
    await models.studio.publishButton.click();
    await page.waitForTimeout(300);
  });
});
