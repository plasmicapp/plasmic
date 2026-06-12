import { expect, Locator } from "@playwright/test";
import { test } from "../../fixtures/test";
import {
  checkFormValues,
  goToProject,
  waitForFrameToLoad,
} from "../../utils/studio-utils";

test.describe("dynamic-initial-value", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupProjectWithHostlessPackages({
      name: "dynamic-initial-value",
      hostLessPackagesInfo: [
        {
          name: "antd5",
          npmPkg: ["@plasmicpkgs/antd5"],
        },
      ],
    });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test("initial values work for different input types", async ({
    models,
    page,
  }) => {
    await models.studio.leftPanel.addComponent("Form");
    await waitForFrameToLoad(page);

    const formFrame = models.studio.frames.first().contentFrame();

    const outlineButton = (models.studio as any).studioFrame.locator(
      'button[data-test-tabkey="outline"]'
    );
    const isPressed = await outlineButton.getAttribute("data-state-isselected");
    if (isPressed === "true") {
      await outlineButton.click();
    }

    async function expectFormState(value: Record<string, unknown>) {
      for (const [key, fieldValue] of Object.entries(value)) {
        await expect(formFrame.locator("body")).toContainText(
          `${JSON.stringify(key)}:${JSON.stringify(fieldValue)}`,
          { timeout: 10_000 }
        );
      }
    }

    await models.studio.leftPanel.insertNode("Text");
    await models.studio.rightPanel.bindTextContentToCustomCode(
      "JSON.stringify($state.form.value)"
    );

    await models.studio.leftPanel.insertNode("plasmic-antd5-form");

    const formItemsAddBtn = models.studio.frame.locator(
      '[data-test-id="formItems-add-btn"]'
    );
    await formItemsAddBtn.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.setDataPlasmicProp("name", "testField");
    await models.studio.rightPanel.setDataPlasmicProp(
      "initialValue",
      "initial text value"
    );
    await expectFormState({ testField: "initial text value" });

    await models.studio.withinLiveMode(async (liveFrame) => {
      const input = liveFrame.locator('input[name="testField"]');
      await expect(input).toHaveValue("initial text value");
    });

    await formItemsAddBtn.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.setDataPlasmicProp("name", "numberField");
    await models.studio.rightPanel.setSelectByLabel("inputType", "Number");
    await models.studio.rightPanel.setDataPlasmicProp("initialValue", "123");
    await expectFormState({
      testField: "initial text value",
      numberField: 123,
    });

    await models.studio.withinLiveMode(async (liveFrame) => {
      const numberInput = liveFrame.locator('input[name="numberField"]');
      await expect(numberInput).toHaveValue("123");
    });

    await formItemsAddBtn.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.setDataPlasmicProp("name", "textAreaField");
    await models.studio.rightPanel.setSelectByLabel("inputType", "Text Area");
    await models.studio.rightPanel.setDataPlasmicProp(
      "initialValue",
      "foo bar text area"
    );
    await expectFormState({
      testField: "initial text value",
      numberField: 123,
      textAreaField: "foo bar text area",
    });

    await models.studio.withinLiveMode(async (liveFrame) => {
      const textarea = liveFrame.locator('textarea[name="textAreaField"]');
      await expect(textarea).toHaveValue("foo bar text area");
    });

    await formItemsAddBtn.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.setDataPlasmicProp("name", "checkboxFalse");
    await models.studio.rightPanel.setSelectByLabel("inputType", "Checkbox");
    await expectFormState({
      testField: "initial text value",
      numberField: 123,
      textAreaField: "foo bar text area",
    });

    await models.studio.withinLiveMode(async (liveFrame) => {
      const checkbox = liveFrame.locator(
        'input[name="checkboxFalse"][type="checkbox"]'
      );
      await expect(checkbox).toBeChecked({ checked: false });
    });

    await formItemsAddBtn.click();
    await page.waitForTimeout(500);
    await models.studio.rightPanel.setDataPlasmicProp("name", "checkboxTrue");
    await models.studio.rightPanel.setSelectByLabel("inputType", "Checkbox");
    await models.studio.rightPanel.clickDataPlasmicProp("initialValue");
    await expectFormState({
      testField: "initial text value",
      numberField: 123,
      textAreaField: "foo bar text area",
      checkboxTrue: true,
    });

    await models.studio.withinLiveMode(async (liveFrame) => {
      const checkbox = liveFrame.locator(
        'input[name="checkboxTrue"][type="checkbox"]'
      );
      await expect(checkbox).toBeChecked({ checked: true });
    });

    await models.studio.rightPanel.checkNoErrors();
  });

  test("initial values work in advanced form mode", async ({
    models,
    page,
  }) => {
    await models.studio.leftPanel.addComponent("Form");
    await waitForFrameToLoad(page);

    const formFrame = models.studio.frames.first().contentFrame();
    const studioFrame = models.studio.frame;
    const treeLabels = models.studio.leftPanel.treeLabels;

    async function expectFormState(value: Record<string, unknown>) {
      const expected = Object.entries(value)
        .map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`)
        .join("");
      await expect(formFrame.locator("body")).toContainText(expected, {
        timeout: 15_000,
      });
    }

    async function expectDataPickerContains(text: string) {
      await expect(
        studioFrame
          .locator('[data-test-id="data-picker"]')
          .getByText(text, { exact: false })
          .first()
      ).toBeVisible({ timeout: 10_000 });
    }

    // Tree navigation uses each row's [data-test-id="tpltree-{uid}"] and
    // [data-test-parent-id] (set in tpl-tree.tsx). Given the form-item row,
    // we can scope all descendant lookups by parent-id and avoid the
    // ambiguity between the Form's "Slot: children" and the form-item's.
    const formItemRow = () =>
      treeLabels.filter({ hasText: "testItem" }).first();

    async function expandRow(row: Locator) {
      const expander = row.locator(
        '.tpltree__label__expander[data-state-isopen="false"]'
      );
      if (await expander.isVisible({ timeout: 500 }).catch(() => false)) {
        await expander.click();
        // Tree expansion is mostly synchronous, but a small beat helps
        // child rows settle before the parent-id lookup that follows.
        await page.waitForTimeout(200);
      }
    }

    async function childRow(parent: Locator, hasText?: string) {
      await parent.waitFor({ timeout: 5_000 });
      const parentId = await parent.getAttribute("data-test-id");
      if (!parentId) {
        throw new Error("Parent tree row missing data-test-id");
      }
      let rows = studioFrame.locator(
        `.tpltree__label[data-test-parent-id="${parentId}"]`
      );
      if (hasText) {
        rows = rows.filter({ hasText });
      }
      return rows.first();
    }

    async function focusFormItem() {
      await models.studio.leftPanel.switchToTreeTab();
      await formItemRow().click();
    }

    async function focusFormItemSlot() {
      await models.studio.leftPanel.switchToTreeTab();
      const formItem = formItemRow();
      await expandRow(formItem);
      const slot = await childRow(formItem, `Slot: "children"`);
      await slot.click();
    }

    async function focusFormItemChild() {
      await models.studio.leftPanel.switchToTreeTab();
      const formItem = formItemRow();
      await expandRow(formItem);
      const slot = await childRow(formItem, `Slot: "children"`);
      await expandRow(slot);
      const child = await childRow(slot);
      await child.click();
    }

    async function replaceFormItemChildWith(itemName: string) {
      await focusFormItemSlot();
      await models.studio.leftPanel.insertNode(itemName);
    }

    // Bind a Text node to the form state so the canvas shows JSON output.
    await models.studio.leftPanel.insertNode("Text");
    await models.studio.rightPanel.bindTextContentToCustomCode(
      "JSON.stringify($state.form.value)"
    );

    // Insert a default form, remove the two default items, then toggle to
    // advanced mode.
    await models.studio.leftPanel.insertNode("plasmic-antd5-form");
    await models.studio.rightPanel.removeItemFromArrayProp("formItems", 0);
    await models.studio.rightPanel.removeItemFromArrayProp("formItems", 0);
    await models.studio.rightPanel.clickDataPlasmicProp(
      "simplified-mode-toggle"
    );
    await page.waitForTimeout(500);

    // Navigate into Form/Slot:"children", then insert a form-item.
    // First form item insertion shows an omnibar to pick the inner control;
    // pick Text.
    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.selectTreeNode(["Form", `Slot: "children"`]);
    await models.studio.leftPanel.insertNode("plasmic-antd5-form-item", {
      expectDrawerToClose: false,
    });
    await models.studio.frame
      .locator('[data-test-id="omnibar-add-Text"]')
      .click();
    await page.waitForTimeout(500);

    // Rename the form item and set name + initialValue.
    await models.studio.renameTreeNode("testItem");
    await models.studio.rightPanel.setDataPlasmicProp("name", "test");
    await models.studio.rightPanel.setDataPlasmicProp("initialValue", "hello");

    await expectFormState({ test: "hello" });
    await checkFormValues(
      [{ name: "test", label: "Label", type: "Text", value: "hello" }],
      formFrame
    );

    // Delete the Input, then re-open the data picker on initialValue and
    // verify the picker echoes the prior value.
    await focusFormItemChild();
    await page.keyboard.press("Delete");
    await focusFormItem();
    await models.studio.rightPanel.clickDataPlasmicProp("initialValue");
    await expectDataPickerContains(`"hello"`);
    await models.studio.rightPanel.closeDataPicker();

    // Replace child with a Number Input.
    await replaceFormItemChildWith("plasmic-antd5-input-number");
    await focusFormItem();
    await models.studio.rightPanel.setDataPlasmicProp("initialValue", "123", {
      reset: true,
    });
    await expectFormState({ test: 123 });
    await checkFormValues(
      [{ name: "test", label: "Label", type: "Number", value: "123" }],
      formFrame
    );
    await focusFormItemChild();
    await page.keyboard.press("Delete");
    await focusFormItem();
    await models.studio.rightPanel.clickDataPlasmicProp("initialValue");
    await expectDataPickerContains(`123`);
    await models.studio.rightPanel.closeDataPicker();

    // Replace child with a Checkbox.
    await replaceFormItemChildWith("plasmic-antd5-checkbox");
    await focusFormItem();
    await models.studio.rightPanel.clickDataPlasmicProp("initialValue");
    await expectFormState({ test: false });
    await models.studio.rightPanel.clickDataPlasmicProp("initialValue");
    await expectFormState({ test: true });
    await checkFormValues(
      [{ name: "test", label: "Label", type: "Checkbox", value: true }],
      formFrame
    );
    await focusFormItemChild();
    await page.keyboard.press("Delete");
    await focusFormItem();
    await models.studio.rightPanel.clickDataPlasmicProp("initialValue");
    await expectDataPickerContains(`true`);
    await models.studio.rightPanel.closeDataPicker();

    // Replace child with a Select.
    await replaceFormItemChildWith("plasmic-antd5-select");
    await focusFormItem();
    await models.studio.rightPanel.setDataPlasmicProp(
      "initialValue",
      "option1",
      { reset: true }
    );
    await expectFormState({ test: "option1" });
    await checkFormValues(
      [{ name: "test", label: "Label", type: "Select", value: "Option 1" }],
      formFrame
    );
    await focusFormItemChild();
    await page.keyboard.press("Delete");
    await focusFormItem();
    await models.studio.rightPanel.clickDataPlasmicProp("initialValue");
    await expectDataPickerContains(`"option1"`);
    await models.studio.rightPanel.closeDataPicker();

    // Replace child with a Radio Group.
    await replaceFormItemChildWith("plasmic-antd5-radio-group");
    await focusFormItem();
    await models.studio.rightPanel.setDataPlasmicProp(
      "initialValue",
      "option2",
      { reset: true }
    );
    await expectFormState({ test: "option2" });
    await checkFormValues(
      [
        {
          name: "test",
          label: "Label",
          type: "Radio Group",
          value: "option2",
        },
      ],
      formFrame
    );
    await focusFormItemChild();
    await page.keyboard.press("Delete");
    await focusFormItem();
    await models.studio.rightPanel.clickDataPlasmicProp("initialValue");
    await expectDataPickerContains(`"option2"`);
    await models.studio.rightPanel.closeDataPicker();

    // Plume Checkbox.
    await replaceFormItemChildWith("Checkbox");
    await focusFormItem();
    await models.studio.rightPanel.clickDataPlasmicProp("initialValue");
    await expectFormState({ test: false });
    await models.studio.rightPanel.clickDataPlasmicProp("initialValue");
    await expectFormState({ test: true });
    await checkFormValues(
      [{ name: "test", label: "Label", type: "Checkbox", value: true }],
      formFrame
    );
    await focusFormItemChild();
    await page.keyboard.press("Delete");
    await focusFormItem();
    await models.studio.rightPanel.clickDataPlasmicProp("initialValue");
    await expectDataPickerContains(`true`);
    await models.studio.rightPanel.closeDataPicker();

    // Plume Text Input.
    await replaceFormItemChildWith("Text Input");
    await focusFormItem();
    await models.studio.rightPanel.setDataPlasmicProp(
      "initialValue",
      "foo bar",
      { reset: true }
    );
    await expectFormState({ test: "foo bar" });
    await checkFormValues(
      [{ name: "test", label: "Label", type: "Text", value: "foo bar" }],
      formFrame
    );

    await models.studio.rightPanel.checkNoErrors();
  });
});
