import { expect } from "@playwright/test";
import bundles from "../../cypress/bundles";
import { test } from "../fixtures/test";

const BUNDLE_NAME = "state-management";

test.describe("interactions-variants", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.importProjectFromTemplate(bundles[BUNDLE_NAME]);
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("can create all types of toggle and single variant interactions", async ({
    models,
    page,
  }) => {
    await models.studio.switchArena("toggle variant interactions");

    const arenaFrame = models.studio.frame
      .frameLocator(".canvas-editor__viewport[data-test-frame-uid]")
      .first();

    let button = arenaFrame.locator("button:has-text('toggle')").first();
    await button.click({ force: true });

    await models.studio.rightPanel.switchToSettingsTab();

    await models.studio.rightPanel.addInteractionButton.waitFor({
      timeout: 10000,
    });
    await models.studio.rightPanel.addInteractionButton.click();

    await page.keyboard.type("onClick");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);

    const actionDropdown = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="action-name"]'
    );
    await actionDropdown.click();

    const updateVariantOption = models.studio.rightPanel.frame.locator(
      'span:text-is("Update variant")'
    );
    await updateVariantOption.waitFor({ state: "visible", timeout: 5000 });
    await updateVariantOption.click();
    await page.waitForTimeout(500);

    const vgroupDropdown = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="vgroup"]'
    );
    await vgroupDropdown.click();
    await page.keyboard.type("advanced");
    await page.keyboard.press("Enter");

    const operationDropdown = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="operation"]'
    );
    await operationDropdown.click();
    await page.keyboard.type("Toggle variant");
    await page.keyboard.press("Enter");

    button = arenaFrame.getByRole("button", {
      name: "activate variant",
      exact: true,
    });
    await button.click({ force: true });

    await models.studio.rightPanel.switchToSettingsTab();

    await models.studio.rightPanel.addInteractionButton.click();

    await page.keyboard.type("onClick");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);

    const actionDropdown2 = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="action-name"]'
    );
    await actionDropdown2.click();

    const updateVariantOption2 = models.studio.rightPanel.frame.locator(
      'span:text-is("Update variant")'
    );
    await updateVariantOption2.waitFor({ state: "visible", timeout: 5000 });
    await updateVariantOption2.click();
    await page.waitForTimeout(500);

    const vgroupDropdown2 = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="vgroup"]'
    );
    await vgroupDropdown2.click();
    await page.keyboard.type("advanced");
    await page.keyboard.press("Enter");

    const operationDropdown2 = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="operation"]'
    );
    await operationDropdown2.click();
    await page.keyboard.type("Activate variant");
    await page.keyboard.press("Enter");

    button = arenaFrame.getByRole("button", {
      name: "deactivate variant",
      exact: true,
    });
    await button.click({ force: true });

    await models.studio.rightPanel.switchToSettingsTab();

    await models.studio.rightPanel.addInteractionButton.click();

    await page.keyboard.type("onClick");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);

    const actionDropdown3 = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="action-name"]'
    );
    await actionDropdown3.click();

    const updateVariantOption3 = models.studio.rightPanel.frame.locator(
      'span:text-is("Update variant")'
    );
    await updateVariantOption3.waitFor({ state: "visible", timeout: 5000 });
    await updateVariantOption3.click();
    await page.waitForTimeout(500);

    const vgroupDropdown3 = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="vgroup"]'
    );
    await vgroupDropdown3.click();
    await page.keyboard.type("advanced");
    await page.keyboard.press("Enter");

    const operationDropdown3 = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="operation"]'
    );
    await operationDropdown3.click();
    await page.keyboard.type("Deactivate variant");
    await page.keyboard.press("Enter");
    await models.studio.withinLiveMode(async (liveFrame) => {
      const variantTextDiv = liveFrame
        .locator("div")
        .filter({ hasText: /^(no variant|toggle variant)$/ })
        .first();

      await expect(variantTextDiv).toContainText("no variant");

      await liveFrame
        .getByRole("button", { name: "activate variant", exact: true })
        .click();
      await expect(variantTextDiv).toContainText("toggle variant");

      await liveFrame
        .getByRole("button", { name: "deactivate variant", exact: true })
        .click();
      await expect(variantTextDiv).toContainText("no variant");

      await liveFrame
        .getByRole("button", { name: "deactivate variant", exact: true })
        .click();
      await expect(variantTextDiv).toContainText("no variant");

      await liveFrame
        .getByRole("button", { name: "toggle", exact: true })
        .click();
      await expect(variantTextDiv).toContainText("toggle variant");

      await liveFrame
        .getByRole("button", { name: "activate variant", exact: true })
        .click();
      await expect(variantTextDiv).toContainText("toggle variant");

      await liveFrame
        .getByRole("button", { name: "toggle", exact: true })
        .click();
      await expect(variantTextDiv).toContainText("no variant");
    });

    await models.studio.switchArena("single variant interactions");

    const allFrames = models.studio.frame.frameLocator(
      ".canvas-editor__viewport[data-test-frame-uid]"
    );

    button = allFrames
      .nth(2)
      .locator("button")
      .filter({ hasText: "Set to red" })
      .first();
    await button.click({ force: true });

    await models.studio.rightPanel.switchToSettingsTab();

    await models.studio.rightPanel.addInteractionButton.click();

    await page.keyboard.type("onClick");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const actionDropdownRed = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="action-name"]'
    );
    await actionDropdownRed.click({ force: true });

    const updateVariantOptionRed = models.studio.rightPanel.frame.locator(
      'span:text-is("Update variant")'
    );
    await updateVariantOptionRed.waitFor({ state: "visible", timeout: 5000 });
    await updateVariantOptionRed.click({ force: true });

    button = allFrames
      .nth(2)
      .getByRole("button", { name: "Set to green", exact: true });
    await button.click({ force: true });

    await models.studio.rightPanel.switchToSettingsTab();

    await models.studio.rightPanel.addInteractionButton.click();

    await page.keyboard.type("onClick");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const actionDropdownGreen = models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="action-name"]')
      .last();
    await actionDropdownGreen.click({ force: true });
    const updateVariantOptionGreen = models.studio.rightPanel.frame.locator(
      'span:text-is("Update variant")'
    );
    await updateVariantOptionGreen.waitFor({ state: "visible", timeout: 5000 });
    await updateVariantOptionGreen.click({ force: true });

    const valueDropdownGreen = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="value"]'
    );
    await valueDropdownGreen.click();
    await page.keyboard.type("green");
    await page.keyboard.press("Enter");

    button = allFrames
      .nth(2)
      .getByRole("button", { name: "Set to blue", exact: true });
    await button.click({ force: true });

    await models.studio.rightPanel.switchToSettingsTab();

    await models.studio.rightPanel.addInteractionButton.click();

    await page.keyboard.type("onClick");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const actionDropdownBlue = models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="action-name"]')
      .last();
    await actionDropdownBlue.click({ force: true });
    const updateVariantOptionBlue = models.studio.rightPanel.frame.locator(
      'span:text-is("Update variant")'
    );
    await updateVariantOptionBlue.waitFor({ state: "visible", timeout: 5000 });
    await updateVariantOptionBlue.click({ force: true });

    const valueDropdownBlue = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="value"]'
    );
    await valueDropdownBlue.click();
    await page.keyboard.type("blue");
    await page.keyboard.press("Enter");

    button = allFrames
      .nth(2)
      .getByRole("button", { name: "clear variant", exact: true });
    await button.click({ force: true });

    await models.studio.rightPanel.switchToSettingsTab();

    await models.studio.rightPanel.addInteractionButton.click();

    await page.keyboard.type("onClick");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const actionDropdownClear = models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="action-name"]')
      .last();
    await actionDropdownClear.click({ force: true });
    const updateVariantOptionClear = models.studio.rightPanel.frame.locator(
      'span:text-is("Update variant")'
    );
    await updateVariantOptionClear.waitFor({ state: "visible", timeout: 5000 });
    await updateVariantOptionClear.click({ force: true });

    const operationDropdownClear = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="operation"]'
    );
    await operationDropdownClear.click();
    await page.keyboard.type("Clear");
    await page.keyboard.press("Enter");

    await models.studio.withinLiveMode(async (liveFrame) => {
      const variantTextDiv = liveFrame
        .locator("div")
        .filter({ hasText: /^(none|red variant|green variant|blue variant)$/ })
        .first();

      await expect(variantTextDiv).toContainText("none");

      await liveFrame
        .getByRole("button", { name: "Set to red", exact: true })
        .click();
      await expect(variantTextDiv).toContainText("red variant");

      await liveFrame
        .getByRole("button", { name: "Set to green", exact: true })
        .click();
      await expect(variantTextDiv).toContainText("green variant");

      await liveFrame
        .getByRole("button", { name: "Set to blue", exact: true })
        .click();
      await expect(variantTextDiv).toContainText("blue variant");

      await liveFrame
        .getByRole("button", { name: "clear variant", exact: true })
        .click();
      await expect(variantTextDiv).toContainText("none");
    });
  });

  test("can create all types of multi variant interactions", async ({
    models,
    page,
  }) => {
    await models.studio.switchArena("multi variant interactions");

    const multiFrame = models.studio.frame
      .frameLocator(".canvas-editor__viewport[data-test-frame-uid]")
      .first();

    const operations = [
      "newValue",
      "multiToggle",
      "multiActivate",
      "multiDeactivate",
    ];
    const variantGroups = [["foo"], ["bar"], ["foo", "bar"]];

    for (const op of operations) {
      for (const vgroup of variantGroups) {
        const buttonText = JSON.stringify(vgroup);

        const button = multiFrame
          .locator(`[data-test-id="${op}"]`)
          .getByText(buttonText, { exact: true });
        await button.click({ force: true });

        await models.studio.rightPanel.switchToSettingsTab();
        await models.studio.rightPanel.addInteractionButton.click();

        await page.keyboard.type("onClick");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(500);

        const actionDropdown = models.studio.rightPanel.frame
          .locator('[data-plasmic-prop="action-name"]')
          .last();
        await actionDropdown.click({ force: true });

        const updateVariantOption = models.studio.rightPanel.frame.locator(
          'span:text-is("Update variant")'
        );
        await updateVariantOption.waitFor({ state: "visible", timeout: 5000 });
        await updateVariantOption.click({ force: true });

        const vgroupDropdown = models.studio.rightPanel.frame.locator(
          '[data-plasmic-prop="vgroup"]'
        );
        await vgroupDropdown.click();
        await page.keyboard.type("multiVariant");
        await page.keyboard.press("Enter");

        const operationDropdown = models.studio.rightPanel.frame.locator(
          '[data-plasmic-prop="operation"]'
        );
        await operationDropdown.click();

        const opLabels: Record<string, string> = {
          newValue: "New value",
          multiToggle: "Toggle variant",
          multiActivate: "Activate variant",
          multiDeactivate: "Deactivate variant",
        };
        await page.keyboard.type(opLabels[op]);
        await page.keyboard.press("Enter");

        const valueDropdown = models.studio.rightPanel.frame.locator(
          '[data-plasmic-prop="value"]'
        );
        const hasValueField = (await valueDropdown.count()) > 0;
        if (hasValueField) {
          await valueDropdown.click();
          for (let i = 0; i < vgroup.length; i++) {
            await page.keyboard.type(vgroup[i]);
            await page.keyboard.press("Enter");
          }
        }
      }
    }

    const clearButton = multiFrame
      .locator('[data-test-id="clearValue"]')
      .locator('button:has-text("Clear variant")');
    await clearButton.click({ force: true });

    await models.studio.rightPanel.switchToSettingsTab();
    await models.studio.rightPanel.addInteractionButton.click();

    await page.keyboard.type("onClick");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const actionDropdownClear = models.studio.rightPanel.frame
      .locator('[data-plasmic-prop="action-name"]')
      .last();
    await actionDropdownClear.click({ force: true });

    const updateVariantOptionClear = models.studio.rightPanel.frame.locator(
      'span:text-is("Update variant")'
    );
    await updateVariantOptionClear.waitFor({ state: "visible", timeout: 5000 });
    await updateVariantOptionClear.click({ force: true });

    const vgroupDropdownClear = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="vgroup"]'
    );
    await vgroupDropdownClear.click();
    await page.keyboard.type("multiVariant");
    await page.keyboard.press("Enter");

    const operationDropdownClear = models.studio.rightPanel.frame.locator(
      '[data-plasmic-prop="operation"]'
    );
    await operationDropdownClear.click();
    await page.keyboard.type("Clear");
    await page.keyboard.press("Enter");

    await models.studio.withinLiveMode(async (liveFrame) => {
      await expect(liveFrame.locator("body")).toContainText("[]");
      await expect(liveFrame.locator("body")).toContainText("no variant");

      const buttons: { locator: any; operation: string; variants: string[] }[] =
        [];

      for (const vgroup of variantGroups) {
        buttons.push({
          locator: liveFrame
            .locator('[data-test-id="newValue"]')
            .getByText(JSON.stringify(vgroup), { exact: true }),
          operation: "newValue",
          variants: vgroup,
        });
      }

      for (const vgroup of variantGroups) {
        buttons.push({
          locator: liveFrame
            .locator('[data-test-id="multiToggle"]')
            .getByText(JSON.stringify(vgroup), { exact: true }),
          operation: "multiToggle",
          variants: vgroup,
        });
      }

      for (const vgroup of variantGroups) {
        buttons.push({
          locator: liveFrame
            .locator('[data-test-id="multiActivate"]')
            .getByText(JSON.stringify(vgroup), { exact: true }),
          operation: "multiActivate",
          variants: vgroup,
        });
      }

      for (const vgroup of variantGroups) {
        buttons.push({
          locator: liveFrame
            .locator('[data-test-id="multiDeactivate"]')
            .getByText(JSON.stringify(vgroup), { exact: true }),
          operation: "multiDeactivate",
          variants: vgroup,
        });
      }

      buttons.push({
        locator: liveFrame
          .locator('[data-test-id="clearValue"]')
          .getByText("Clear variant", { exact: true }),
        operation: "clear",
        variants: [],
      });

      const Random = (await import("prando")).default;
      const random = new Random(12345);
      let currentVariants: string[] = [];

      for (let i = 0; i < 50; i++) {
        const buttonIndex = Math.floor(random.next() * buttons.length);
        const button = buttons[buttonIndex];

        await button.locator.click();

        switch (button.operation) {
          case "newValue":
            currentVariants = [...button.variants];
            break;
          case "multiToggle":
            for (const v of button.variants) {
              const index = currentVariants.indexOf(v);
              if (index >= 0) {
                currentVariants.splice(index, 1);
              } else {
                currentVariants.push(v);
              }
            }
            break;
          case "multiActivate":
            for (const v of button.variants) {
              if (!currentVariants.includes(v)) {
                currentVariants.push(v);
              }
            }
            break;
          case "multiDeactivate":
            currentVariants = currentVariants.filter(
              (v) => !button.variants.includes(v)
            );
            break;
          case "clear":
            currentVariants = [];
            break;
        }

        const jsonText = JSON.stringify(currentVariants);
        await expect(liveFrame.locator("body")).toContainText(jsonText);

        if (currentVariants.length === 0) {
          await expect(liveFrame.locator("body")).toContainText("no variant");
        } else {
          for (const v of currentVariants) {
            await expect(liveFrame.locator("body")).toContainText(
              `${v} variant`
            );
          }
        }
      }
    });
  });
});
