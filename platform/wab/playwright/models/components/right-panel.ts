import { FrameLocator, Locator, Page, expect, test } from "playwright/test";
import { modifierKey } from "../../utils/modifier-key";
import { updateFormValuesInLiveMode } from "../../utils/studio-utils";
import { BaseModel } from "../BaseModel";

export class RightPanel extends BaseModel {
  readonly frame: FrameLocator = this.studioFrame;
  readonly addInteractionButton: Locator = this.frame.locator(
    '[data-test-id="add-interaction"]'
  );
  readonly interactionsSearchInput: Locator = this.frame.locator(
    "#interactions-select"
  );
  readonly actionsDropdownButton: Locator = this.frame.locator(
    '[data-plasmic-prop="action-name"]'
  );
  readonly addServerQueryButton: Locator = this.frame.locator(
    '[id="server-queries-add-btn"]'
  );
  readonly serverQueriesSection: Locator = this.frame.locator(
    '[id="server-queries-section"]'
  );
  readonly stateButton: Locator = this.frame.locator(
    '[data-plasmic-prop="variable"]'
  );
  readonly windowSaveButton: Locator = this.frame
    .locator('[data-test-id="data-picker"]')
    .locator("text=Save");
  readonly operationDropdownButton: Locator = this.frame.locator(
    '[data-plasmic-prop="operation"]'
  );
  readonly valueButton: Locator = this.frame.locator(
    '[data-plasmic-prop="value"]'
  );
  readonly valueCodeInput: Locator = this.frame.locator(
    "div.react-monaco-editor-container"
  );
  readonly closeSidebarButton: Locator = this.frame.locator(
    '[data-test-id="close-sidebar-modal"]'
  );
  readonly sidebarModal: Locator = this.frame.locator('[id="sidebar-modal"]');
  readonly designTabButton: Locator = this.frame.locator(
    'button[data-test-tabkey="style"]'
  );
  readonly componentNameInput: Locator = this.frame.locator(
    'input[data-test-class="simple-text-box"]'
  );
  readonly componentNameSubmit: Locator = this.frame.locator(
    '[data-test-id="prompt-submit"]'
  );
  readonly zIndexInput: Locator = this.frame.locator(
    'input[data-plasmic-prop="z-index"]'
  );
  readonly textContentButton: Locator = this.frame.locator(
    "button.property-editor.text-ellipsis.flex-fill.text-align-left.right-panel-input-background.text-set"
  );
  readonly tagDropdownButton: Locator = this.frame.locator(
    'div[data-test-class="tpl-tag-select"]'
  );
  readonly addRepeatElementButton: Locator = this.frame.locator(
    'button[data-test-id="btn-repeating-element-add"]'
  );
  readonly repeatCollectionButton: Locator = this.frame
    .locator('div[data-test-id="repeating-element-collection"]')
    .locator("div.code-editor-input");
  readonly monacoSwitchToCodeButton: Locator =
    this.frame.getByText("Switch to Code");
  readonly applyButtonMenu: Locator = this.frame.locator(
    'button[data-test-id="apply-menu"]'
  );
  readonly useDynamicValueButton: Locator =
    this.frame.getByText("Use dynamic value");
  readonly elementVariantsButton: Locator =
    this.frame.getByText("Element variants");
  readonly addElemetVariantsButton: Locator = this.frame.locator(
    'button[data-test-id="add-private-interaction-variant-button"]'
  );
  readonly variantsRow: Locator = this.frame.locator(
    'div[data-test-class="variant-row"]'
  );
  readonly variantStopRecording: Locator = this.frame.locator(
    '[data-test-class="variant-record-button-stop"]'
  );
  readonly variantStopViewing: Locator = this.frame.locator(
    '[data-test-class="variant-pin-button-deactivate"]'
  );
  readonly variantsInput: Locator = this.frame
    .locator('div[data-test-class="variant-row"]')
    .locator("div.flex-fill")
    .first();
  readonly fontSizeInput: Locator = this.frame.getByRole("textbox", {
    name: "Size",
  });
  readonly fontFamilyInput: Locator = this.frame.locator(
    `.canvas-editor__right-pane [data-test-id="font-family-selector"]`
  );
  readonly underlineTextDecorationButton: Locator = this.frame
    .locator('[data-test-id="text-decoration-selector"]')
    .locator("button")
    .nth(0);
  readonly componentDataTabButton: Locator = this.frame.locator(
    'button[data-test-tabkey="component"]'
  );
  readonly globalVariantsHeader: Locator =
    this.frame.getByText("Global Variants");
  readonly responsivenessTabButton: Locator = this.frame
    .locator('div[data-test-class="variants-section"]')
    .nth(1)
    .locator("button")
    .first();
  readonly artboardConfigButton: Locator = this.frame.locator(
    '[data-test-id="artboard-config-button"]'
  );
  readonly artboardSizeWidthInput: Locator = this.frame.locator(
    '[data-test-id="artboard-size-width"]'
  );
  readonly variantRow: Locator = this.frame.locator(
    '[data-test-class="variant-row"]'
  );
  readonly variantRecordButtonStart: Locator = this.frame.locator(
    '[data-test-class="variant-record-button-start"]'
  );

  readonly addPropButton: Locator = this.frame.locator(
    '[data-test-id="add-prop-btn"]'
  );
  readonly propNameInput: Locator = this.frame.locator(
    '[data-test-id="prop-name"]'
  );
  readonly propTypeDropdown: Locator = this.frame.locator(
    '[data-test-id="prop-type"]'
  );
  readonly defaultValueInput: Locator = this.frame.locator(
    'input[data-plasmic-prop="default-value"]'
  );
  readonly propSubmitButton: Locator = this.frame.locator(
    'button[data-test-id="prop-submit"]'
  );
  readonly addStateButton: Locator = this.frame.locator(
    '[data-test-id="add-state-btn"]'
  );
  readonly variableNameInput: Locator = this.frame.locator(
    '[data-plasmic-prop="variable-name"]'
  );
  readonly variableTypeDropdown: Locator = this.frame.locator(
    '[data-plasmic-prop="variable-type"]'
  );
  readonly initialValueInput: Locator = this.frame.locator(
    '[data-plasmic-prop="initial-value"]'
  );
  readonly allowExternalAccessCheckbox: Locator = this.frame.locator(
    'label [data-test-id="allow-external-access"]'
  );
  readonly accessTypeDropdown: Locator = this.frame.locator(
    '[data-plasmic-prop="access-type"]'
  );
  readonly confirmButton: Locator = this.frame.locator(
    '[data-test-id="confirm"]'
  );
  readonly settingsTabButton: Locator = this.frame.locator(
    'button[data-test-tabkey="settings"]'
  );
  readonly addInteractionVariantButton: Locator = this.frame.locator(
    '[data-event="variantspanel-section-add-variant-to-group"]'
  );
  readonly variantSelectorInput: Locator = this.frame.locator(
    'input[placeholder="e.g. :hover, :focus, :nth-child(odd)"]'
  );
  readonly doneButton: Locator = this.frame.getByText("Done");
  readonly htmlAttributesSection: Locator = this.frame.locator(
    '[data-test-id="html-attributes-section"] [data-test-id="show-extra-content"]'
  );
  readonly propEditorRows: Locator = this.frame.locator(
    '[data-test-id^="prop-editor-row-"]:not([data-test-id^="prop-editor-row-default"])'
  );
  readonly previewValueInput: Locator = this.frame
    .locator('div[data-test-id="preview-value"]')
    .locator('input[data-plasmic-prop="preview-value"]');

  readonly previewValueMenuButton: Locator = this.frame.locator(
    '[data-test-id="preview-value-menu-btn"]'
  );

  readonly defaultValueMenuButton: Locator = this.frame.locator(
    '[data-test-id="default-value-menu-btn"]'
  );

  readonly pagePathInput: Locator = this.frame.locator(
    '[data-test-id="page-path"] input'
  );
  readonly dataPickerSaveButton: Locator = this.frame.locator(
    '[data-test-id="data-picker"] button:has-text("Save")'
  );

  readonly projectMenuButton: Locator = this.frame.locator(
    '[data-test-id="project-menu-btn"]'
  );
  readonly configureProjectButton: Locator = this.frame.locator(
    '[data-test-id="configure-project"]'
  );
  readonly hostUrlInput: Locator = this.page.locator(
    '[data-test-id="host-url-input"]'
  );
  readonly hostConfirmButton: Locator = this.page.locator(
    'button:has-text("Confirm")'
  );
  readonly widthInput: Locator = this.frame.locator(
    'input[data-plasmic-prop="width"]'
  );
  readonly heightInput: Locator = this.frame.locator(
    'input[data-plasmic-prop="height"]'
  );
  readonly yearInput: Locator = this.frame.locator('input[placeholder="2022"]');
  readonly yearButton: Locator = this.frame.locator('button:has-text("2023")');
  readonly yearOption2020: Locator = this.frame.locator(
    'div[role="option"]:has-text("2020")'
  );

  readonly addHtmlAttributeButton: Locator = this.frame.locator(
    '[data-test-id="add-html-attribute"]'
  );

  readonly sidebarSectionBody: Locator = this.frame.locator(
    ".SidebarSection__Body"
  );

  readonly addArgButton: Locator = this.frame.locator(
    '[data-test-id="add-arg"]'
  );
  readonly argNameInput: Locator = this.frame.locator(
    '[data-test-id="arg-name"]'
  );
  readonly argTypeDropdown: Locator = this.frame.locator(
    '[data-test-id="arg-type"]'
  );
  readonly destinationInput = this.frame.locator(
    '[data-plasmic-prop="destination"]'
  );
  readonly conditionalExprButton = this.frame.locator(
    '[data-plasmic-prop="conditional-expr"]'
  );
  readonly customFunctionInput = this.frame.locator(
    '[data-plasmic-prop="customFunction"]'
  );
  readonly eventRefButton = this.frame.locator(
    '[data-plasmic-prop="eventRef"]'
  );
  readonly addNewActionButton = this.frame.locator(
    '[data-test-id="add-new-action"]'
  );
  readonly addVariantGroupButton = this.frame.locator(
    '[data-test-id="add-variant-group-button"] .ant-dropdown-trigger'
  );
  readonly importedDataSourceDropdownButton: Locator = this.page.getByRole(
    "button",
    { name: "Select an integration from" }
  );
  readonly dynamicPageTableButton: Locator = this.frame.getByRole("button", {
    name: "unset",
  });
  constructor(page: Page) {
    super(page);
  }

  async getElementWithDataKey(key: string): Promise<Locator> {
    const element = this.frame.locator(`[data-key="${key}"]`);
    return element;
  }

  async selectInteractionEventById(eventHandler: string): Promise<Locator> {
    const dropdownElement = this.frame.locator(
      `#interactions-select-opt-${eventHandler}`
    );
    return dropdownElement;
  }

  getStateVariable(stateVar: string): Locator {
    const stateVariable = this.frame
      .locator(`[data-test-id="0-${stateVar}"]`)
      .first();
    return stateVariable;
  }

  async setPosition(
    direction: "left" | "right" | "top" | "bottom",
    px: number
  ) {
    const directionButton = this.frame.locator(
      `button[data-plasmic-pos-trigger="${direction}"]`
    );
    const pixelsInput = this.frame.locator(
      `input[data-plasmic-prop="${direction}"]`
    );
    await this.zIndexInput.scrollIntoViewIfNeeded();
    await directionButton.click();
    await pixelsInput.fill(px.toString());
    await this.page.keyboard.press("Enter");
  }

  async setTextNodeTag(tag: string) {
    await this.tagDropdownButton.click();
    await this.tagDropdownButton.locator("input").fill(tag);
    await this.tagDropdownButton.locator("input").press("Enter");
  }

  async insertMonacoCode(code: string) {
    await test.step(`insertMonacoCode: ${code}`, async () => {
      await this.page.waitForTimeout(1000);

      if (await this.monacoSwitchToCodeButton.isVisible()) {
        await this.monacoSwitchToCodeButton.click();
      }

      await this.valueCodeInput.waitFor({ state: "visible" });
      await this.valueCodeInput.click();
      await this.valueCodeInput.click({ clickCount: 3 });
      await this.page.keyboard.press(`${modifierKey}+A`);
      await this.page.keyboard.press("Delete");
      await this.page.keyboard.press("Backspace");

      for (const char of code) {
        await this.page.keyboard.type(char);
        await this.page.waitForTimeout(5);
      }

      await this.page.waitForTimeout(100);
      await this.windowSaveButton.click();
      await this.page.waitForTimeout(100);
    });
  }

  async insertMonacoCodeFast(code: string) {
    await this.page.waitForTimeout(1000);
    if (await this.monacoSwitchToCodeButton.isVisible()) {
      await this.monacoSwitchToCodeButton.click();
    }
    await this.valueCodeInput.waitFor({ state: "visible" });
    await this.valueCodeInput.click();
    const currentValue = await this.valueCodeInput.textContent();
    if (currentValue && currentValue.trim() !== "") {
      const modifier = process.platform === "darwin" ? "Meta" : "Control";
      await this.page.keyboard.press(`${modifier}+A`);
      await this.page.keyboard.press("Delete");
      await this.page.keyboard.press("Backspace");
    }

    await this.valueCodeInput.evaluate((element, pastePayload) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData("text/plain", pastePayload);
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer as any,
      });
      element.dispatchEvent(pasteEvent);
    }, code);

    await this.page.waitForTimeout(100);
    await this.windowSaveButton.click();
    await this.page.waitForTimeout(100);
  }

  async chooseFontSize(fontSize: string) {
    await this.designTabButton.click();
    await this.fontSizeInput.first().click();
    await this.page.waitForTimeout(500);

    const isNumeric = /^\d+(\.\d+)?(px|em|rem|%)?$/.test(fontSize);

    if (isNumeric) {
      await this.fontSizeInput.first().fill(fontSize);
      await this.page.waitForTimeout(500);
      await this.page.keyboard.press("Enter");
    } else {
      const searchInput = this.frame.locator(
        'input[placeholder="Search for token"]'
      );
      const searchInputVisible = await searchInput
        .isVisible({ timeout: 1000 })
        .catch(() => false);

      if (searchInputVisible) {
        await this.page.waitForTimeout(100);
        await searchInput.fill(fontSize);
        await this.page.waitForTimeout(100);
        await this.page.keyboard.press("Enter");
        await this.page.waitForTimeout(100);
      } else {
        await this.page.keyboard.type(fontSize);
        await this.page.waitForTimeout(500);
        await this.page.keyboard.press("Enter");
      }
    }
  }

  async switchToComponentDataTab() {
    await this.componentDataTabButton.click();
  }

  async switchToResponsivenessTab() {
    await this.responsivenessTabButton.click();
  }

  async openArtboardSettings() {
    await this.artboardConfigButton.click();
  }

  async setArtboardWidth(width: string) {
    await this.artboardSizeWidthInput.clear();
    await this.artboardSizeWidthInput.fill(width);
    await this.page.keyboard.press("Enter");
  }

  async selectVariant(variantName: string) {
    const variantRow = this.frame
      .locator(`[data-test-class="variant-row"]`)
      .getByText(variantName);

    await variantRow.click();
  }

  async addComponentProp(
    propName: string,
    propType: string,
    defaultValue?: string,
    previewValue?: string
  ) {
    await this.addPropButton.click();
    await this.selectPropType(propType);
    await this.propNameInput.fill(propName);

    if (defaultValue) {
      await this.defaultValueInput.fill(defaultValue);
    }

    if (previewValue) {
      await this.previewValueInput.fill(previewValue);
    }

    await this.propSubmitButton.click();
  }

  async switchToSettingsTab() {
    await this.settingsTabButton.click();
  }

  async addInteractionVariant(variantName: string) {
    await this.addInteractionVariantButton.click({ force: true });
    await this.variantSelectorInput.fill(variantName);
    await this.variantSelectorInput.press("Enter");
    await this.doneButton.click();
  }

  async expandHtmlAttributesSection() {
    await this.htmlAttributesSection.click();
  }

  async getPropEditorRowsCount() {
    return this.propEditorRows.count();
  }

  async checkNoErrors() {
    const errorElements = this.frame.locator(".ant-notification-notice-close");
    const count = await errorElements.count();
    if (count > 0) {
      throw new Error(`Found ${count} error notifications`);
    }
  }

  async selectPropType(propType: string) {
    await this.propTypeDropdown.first().click();
    await this.frame.locator(`[data-key="${propType}"]`).click();
  }

  async selectVariableType(variableType: string) {
    await this.variableTypeDropdown.click();
    await this.frame.locator(`[data-key="${variableType}"]`).click();
  }

  async selectAccessType(accessType: string) {
    await this.accessTypeDropdown.click();
    await this.frame.locator(`[data-key="${accessType}"]`).click();
  }

  async setComponentPropPreviewValue(
    propName: string,
    previewValue: string | undefined
  ) {
    await this.openComponentPropModal(propName);
    if (previewValue !== undefined) {
      await this.previewValueInput.fill(previewValue);
    } else {
      await this.previewValueMenuButton.first().click();
      await this.frame.getByText("Unset").click();
    }
    await this.propSubmitButton.first().click();
  }

  async setComponentPropDefaultValue(
    propName: string,
    defaultValue: string | undefined
  ) {
    await this.openComponentPropModal(propName);

    if (defaultValue !== undefined) {
      await this.defaultValueInput.fill(defaultValue);
    } else {
      await this.defaultValueMenuButton.first().click();
      await this.frame.getByText("Unset").click();
    }
    await this.propSubmitButton.click();
  }

  async openComponentPropModal(propName: string) {
    await this.switchToComponentDataTab();
    await this.frame.getByText(propName).click({ button: "right" });
    await this.frame.getByText("Configure prop").click();
  }

  async removePropValue(propName: string) {
    const propRow = await this.getPropEditorRow(propName);
    await propRow.first().waitFor({ state: "visible", timeout: 10000 });
    await propRow.click({ button: "right" });
    await this.frame.getByText(`Remove ${propName} prop`).click();
  }

  async getPropEditorRow(propName: string) {
    return this.frame
      .locator(`[data-test-id^="prop-editor-row-"]`)
      .filter({ hasText: propName });
  }

  async setDataPlasmicProp(
    prop: string,
    value: string,
    opts?: { reset?: boolean }
  ) {
    const editor = this.frame.locator(`[data-plasmic-prop="${prop}"]`).last();
    await editor.click();
    await this.page.waitForTimeout(200);

    if (opts?.reset) {
      await this.page.keyboard.press("Control+a");
      await this.page.waitForTimeout(100);
      await this.page.keyboard.press("Backspace");
      await this.page.waitForTimeout(100);
    }

    await this.page.keyboard.type(value);
    await this.page.waitForTimeout(2000);
    await this.page.keyboard.press("Enter");
  }

  async setPagePath(path: string) {
    await this.pagePathInput.click();
    await this.page.keyboard.press("Control+a");
    await this.page.keyboard.press("Backspace");
    await this.pagePathInput.fill(path);
    await this.page.keyboard.press("Enter");
  }

  async setPageParamPreviewValue(paramName: string, value: string) {
    const pageParamInput = this.frame.locator(
      `[data-test-id="page-param-${paramName}"] input`
    );
    await pageParamInput.click();
    await this.page.keyboard.press("Control+a");
    await this.page.keyboard.press("Backspace");
    await pageParamInput.fill(value);
    await this.page.keyboard.press("Enter");
  }

  async selectPathInDataPicker(path: string[]) {
    for (let i = 0; i < path.length; i++) {
      const pathElement = this.frame.locator(
        `[data-test-id="data-picker"] [data-test-id="${i}-${path[i]}"]`
      );
      await pathElement.click();
    }
    await this.dataPickerSaveButton.click();
  }

  async selectDataPickerItem(itemName: string) {
    const item = this.frame
      .locator(`[data-test-id="data-picker"]`)
      .getByText(itemName);
    await item.click();
    await this.dataPickerSaveButton.click();
  }

  async repeatOnCustomCode(code: string) {
    await this.addRepeatElementButton.click();
    await this.repeatCollectionButton.click();
    await this.insertMonacoCode(code);
  }

  async repeatOnCustomCodeFast(code: string) {
    await this.addRepeatElementButton.click();
    await this.repeatCollectionButton.click();
    await this.insertMonacoCodeFast(code);
  }

  async switchToDesignTab() {
    await this.designTabButton.click();
  }

  async expandSizeSection() {
    const sizeSection = this.frame.locator(
      '[data-test-id="size-section"] [data-test-id="show-extra-content"]'
    );
    if (await sizeSection.isVisible()) {
      await sizeSection.click();
    }
  }

  async addVariantGroup(groupName: string) {
    await this.addVariantGroupButton.click();

    await this.page.waitForTimeout(500);

    const singleOption = this.frame
      .locator(".ant-dropdown-menu")
      .getByText("single");
    await singleOption.click({ force: true });

    await this.page.keyboard.type(groupName);
    await this.page.keyboard.press("Enter");
  }

  async addVariantToGroup(groupName: string, variantName: string) {
    const variantGroupWidget = this.frame
      .locator('[data-test-class="variants-section"]')
      .filter({ hasText: groupName });
    const addVariantButton = variantGroupWidget.locator(
      '[data-test-class="add-variant-button"]'
    );
    await addVariantButton.click();

    await this.page.keyboard.type(variantName);
    await this.page.keyboard.press("Enter");
  }

  async configureProjectAppHost(page: string) {
    await this.projectMenuButton.click({ timeout: 10000 });
    await this.configureProjectButton.click();

    const plasmicHost = `http://localhost:${
      process.env.CUSTOM_HOST_PORT || 3000
    }/${page}`;

    await this.hostUrlInput.clear();
    await this.hostUrlInput.fill(plasmicHost);
    await this.hostConfirmButton.click();

    const hostFrame = this.page.locator(
      `iframe[src^="http://localhost:${
        process.env.CUSTOM_HOST_PORT || 3000
      }/${page}"]`
    );

    await hostFrame.waitFor({ timeout: 60000 });
  }

  async setWidth(value: string) {
    await this.widthInput.click();
    await this.widthInput.fill(value);
    await this.page.keyboard.press("Enter");
  }

  async setHeight(value: string) {
    await this.heightInput.click();
    await this.heightInput.fill(value);
    await this.page.keyboard.press("Enter");
  }

  async setYear(value: string) {
    await this.yearInput.focus();
    await this.yearInput.fill(value);
    await this.yearInput.blur();
    await this.page.keyboard.press("Enter");
  }

  async clickYearButton() {
    await this.yearButton.click();
  }

  async selectYear2020() {
    await this.yearOption2020.click({ force: true });
  }

  async closeNotificationWarning() {
    await this.frame
      .locator(".ant-notification-notice-message")
      .filter({ hasText: "Unsupported host app detected" })
      .waitFor();
    await this.frame.locator(".ant-notification-notice-close").click();
    await this.frame
      .locator(".ant-notification-topRight")
      .waitFor({ state: "hidden" });
  }

  async addComplexInteraction(
    eventHandler: string,
    interactions: Array<{
      actionName: string;
      args: {
        variable?: string[];
        operation?: string;
        value?: string;
        arguments?: Record<string, string>;
        eventRef?: string;
        customFunction?: string;
      };
      mode?: "always" | "never" | "when";
      conditionalExpr?: string;
    }>
  ) {
    await this.addInteractionButton.click();
    await this.interactionsSearchInput.fill(eventHandler);
    while (!(await this.interactionsSearchInput.isVisible())) {
      await this.addInteractionButton.click();
      await this.interactionsSearchInput.fill(eventHandler);
    }
    const interactionsEventDropdownElement =
      await this.selectInteractionEventById(eventHandler);
    await interactionsEventDropdownElement.click();

    for (
      let interactionIndex = 0;
      interactionIndex < interactions.length;
      interactionIndex++
    ) {
      const interaction = interactions[interactionIndex];

      if (interactionIndex > 0) {
        await this.addNewActionButton.click({ force: true });
      }

      await this.actionsDropdownButton.first().click();
      await (await this.getElementWithDataKey(interaction.actionName)).click();

      if (interaction.args.variable) {
        await this.stateButton.click();
        await this.getStateVariable(interaction.args.variable[0]).click();
        await this.saveDataPicker();
      }

      if (interaction.args.operation) {
        await this.operationDropdownButton.click();
        const operations: Record<string, number> = {
          newValue: 0,
          clearValue: 1,
          increment: 2,
          decrement: 3,
          toggle: 4,
          push: 5,
          splice: 6,
        };
        const op = interaction.args.operation;
        const operationIntValue = operations[op] ?? 0;
        await this.frame.locator(`[data-key="${operationIntValue}"]`).click();
      }

      if (interaction.args.value) {
        await this.valueButton.click();
        await this.insertMonacoCode(interaction.args.value);
      }

      if (interaction.args.eventRef) {
        await this.actionsDropdownButton.first().click();
        await (await this.getElementWithDataKey("invokeEventHandler")).click();

        await this.frame
          .locator("#sidebar-modal")
          .waitFor({ state: "visible", timeout: 10000 });
        await this.eventRefButton.waitFor({ state: "visible", timeout: 10000 });
        await this.eventRefButton.click();
        await this.frame
          .locator(`[data-key="'${interaction.args.eventRef}'"]`)
          .click();
      }

      if (interaction.args.arguments) {
        for (const [key, value] of Object.entries(interaction.args.arguments)) {
          const input = this.frame.locator(`[data-plasmic-prop="${key}"]`);
          await input.click({ button: "right" });
          await this.useDynamicValueButton.click();
          await this.insertMonacoCode(value);
        }
      }

      if (interaction.args.customFunction) {
        await this.customFunctionInput.click();
        await this.insertMonacoCode(interaction.args.customFunction);
      }

      if (interaction.mode) {
        const modeButton = this.frame.locator(
          `[data-plasmic-prop="mode-${interaction.mode}"]`
        );
        await modeButton.click();

        if (interaction.mode === "when" && interaction.conditionalExpr) {
          await this.conditionalExprButton.click();
          await this.insertMonacoCode(interaction.conditionalExpr);
        }
      }
    }
    await this.closeSidebarButton.click();
  }

  async addNavigationInteraction(
    eventHandler: string,
    interaction: {
      destination: string;
      isDynamicValue?: boolean;
    }
  ) {
    await this.addInteractionButton.click();
    await this.interactionsSearchInput.fill(eventHandler);
    await this.page.waitForTimeout(300);
    while (!(await this.interactionsSearchInput.isVisible())) {
      await this.addInteractionButton.click();
      await this.interactionsSearchInput.fill(eventHandler);
      await this.page.waitForTimeout(300);
    }
    const interactionsEventDropdownElement =
      await this.selectInteractionEventById(eventHandler);
    await interactionsEventDropdownElement.click();

    await this.actionsDropdownButton.first().click();
    await (await this.getElementWithDataKey("navigation")).click();

    if (interaction.isDynamicValue) {
      await this.destinationInput.click({ button: "right" });
      await this.useDynamicValueButton.click();
      await this.insertMonacoCode(interaction.destination);
    } else {
      await this.destinationInput.click();
      await this.destinationInput.fill(interaction.destination);
    }

    await this.closeSidebarButton.click();
  }

  async createNewEventHandler(
    eventName: string,
    args: { name: string; type: string }[]
  ) {
    await this.switchToComponentDataTab();
    await this.addPropButton.click();
    await this.propNameInput.fill(eventName);
    await this.selectPropType("eventHandler");

    for (const arg of args) {
      await this.addArgButton.click();
      await this.argNameInput.last().fill(arg.name);
      await this.argTypeDropdown.last().click();
      await this.frame.locator(`[data-key="${arg.type}"]`).click();
    }
    await this.propSubmitButton.click();
  }

  async addHtmlAttribute(attr: string, value: string) {
    await this.addHtmlAttributeButton.click();

    await this.page.waitForTimeout(200);
    await this.page.keyboard.type(attr);
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press("Enter");
    await this.page.waitForTimeout(200);
    await this.frame.locator(`[data-plasmic-prop="${attr}"]`).click();
    await this.page.waitForTimeout(200);
    await this.page.keyboard.type(value);
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press("Enter");
  }

  async getPropEditorRowByPropName(propName: string) {
    return this.frame.locator(
      `[data-test-id="prop-editor-row-${propName}"] label`
    );
  }

  async pickDataSource(dataSourceName: string) {
    const pickIntegrationBtn = this.frame.locator(
      "#data-source-modal-pick-integration-btn"
    );
    if (await pickIntegrationBtn.isVisible()) {
      await pickIntegrationBtn.click();
      await this.page.waitForTimeout(1000);

      await this.importedDataSourceDropdownButton.click();
      await this.page
        .getByLabel("Plasmic Tutorial Integrations")
        .getByText(dataSourceName)
        .click();

      await this.page.getByRole("button", { name: "Confirm" }).click();
    } else {
      await this.setDataPlasmicProp("dataSource", dataSourceName);
    }
  }

  async clickPageData() {
    await this.frame.getByText("Page data").click();
  }

  async getPagePathInput() {
    return this.frame.locator('[data-test-id="page-path"] input');
  }

  async getPageParamNameInput() {
    return this.frame.locator('[data-test-id="page-param-name"] input');
  }

  async clickViewDifferentRecord() {
    await this.frame.getByText("View different record").click();
  }

  async clickShowFilters() {
    await this.frame.getByText("Show filters").click();
  }

  async getViewButtons() {
    return this.frame.locator(
      ".bottom-modals tbody tr[data-row-key] td:has-text('View'):first-child"
    );
  }

  async clickCreateDynamicPageButton() {
    await this.frame
      .getByRole("button", { name: "Create dynamic page" })
      .and(this.frame.locator(":not([disabled])"))
      .click();
  }

  async waitForProductIdButton() {
    await this.frame
      .getByRole("button", { name: "product_id" })
      .waitFor({ state: "visible" });
  }

  async addFormItem(prop: string, value: Record<string, any>) {
    const addBtn = this.frame.locator(`[data-test-id="${prop}-add-btn"]`);
    await addBtn.waitFor({ timeout: 5000 });
    await addBtn.click();

    for (const key in value) {
      if (key === "inputType") {
        await this.setSelectByLabel(key, value[key]);
      } else if (key === "options") {
        for (const option of value[key]) {
          await this.addItemToArrayProp(key, { text: option });
        }
      } else {
        await this.setDataPlasmicProp(key, value[key]);
      }
    }

    await this.closePopoverFrame();
  }

  async addItemToArrayProp(prop: string, value: Record<string, any>) {
    const addBtn = this.frame.locator(`[data-test-id="${prop}-add-btn"]`);
    await addBtn.click();
    await this.page.waitForTimeout(200);

    for (const key in value) {
      await this.setDataPlasmicProp(key, value[key]);
    }
  }

  async removeItemFromArrayProp(prop: string, index: number) {
    const removeBtn = this.frame.locator(
      `[data-test-id="${prop}-${index}-remove"]`
    );
    await removeBtn.click();
    await this.page.waitForTimeout(500);
  }

  async setSelectByLabel(label: string, value: string) {
    const result = await this.page.evaluate(
      ({ selectName, labelValue }) => {
        const w = window as any;
        if (w.dbg?.testControls?.[selectName]?.setByLabel) {
          return w.dbg.testControls[selectName].setByLabel(labelValue);
        }
        return null;
      },
      { selectName: label, labelValue: value }
    );

    if (result !== null) {
      return;
    }

    const select = this.frame.locator(`[data-plasmic-prop="${label}"]`);
    await expect(select).toBeVisible({ timeout: 10000 });
    await select.click();

    const optionWithQuotes = this.frame.locator(`[data-key="'${value}'"]`);
    if ((await optionWithQuotes.count()) > 0) {
      await optionWithQuotes.click();
    } else {
      const optionWithoutQuotes = this.frame.locator(`[data-key="${value}"]`);
      await optionWithoutQuotes.click();
    }
  }

  async setSelectByValue(selectName: string, value: string) {
    const result = await this.page.evaluate(
      ({ name, val }) => {
        const w = window as any;
        if (w.dbg?.testControls?.[name]?.setByValue) {
          return w.dbg.testControls[name].setByValue(val);
        }
        return null;
      },
      { name: selectName, val: value }
    );

    if (result !== null) {
      return;
    }

    await this.setSelectByLabel(selectName, value);
  }

  async updateFormValuesLiveMode(newValues: any, liveFrame: FrameLocator) {
    await updateFormValuesInLiveMode(newValues, liveFrame);
  }

  async bindTextContentToCustomCode(code: string) {
    const textContentLabel = this.frame.locator(
      '[data-test-id="text-content"] label'
    );
    await textContentLabel.click({ button: "right" });
    await this.frame.getByText("Use dynamic value").click();
    await this.page.waitForTimeout(500);
    await this.ensureDataPickerInCustomCodeMode();
    await this.page.waitForTimeout(500);
    await this.insertMonacoCode(code);
  }

  async ensureDataPickerInCustomCodeMode() {
    const switchToCodeButton = this.frame.getByText("Switch to Code");
    if (await switchToCodeButton.isVisible()) {
      await switchToCodeButton.click();
    }
  }

  async addState(state: {
    name: string;
    variableType: string;
    accessType?: string;
    initialValue?: string;
    isInitValDynamicValue?: boolean;
  }) {
    const existingStates = await this.frame
      .locator('[data-test-id^="state-row-"]')
      .count();

    const addStateButtons = [
      this.frame.locator('[data-test-id="add-state-btn"]').first(),
      this.frame
        .locator('button:has(svg[data-test-id="add-state-btn"])')
        .first(),
      this.frame.locator('button:has([data-test-id="add-state-btn"])').first(),
      this.frame.locator('[aria-label="Add state variable"]').first(),
      this.frame.locator('button[aria-label="Add state variable"]').first(),
      this.frame.locator('button:has-text("Add state")').first(),
      this.frame
        .locator("button")
        .filter({ has: this.frame.locator('[data-test-id="add-state-btn"]') })
        .first(),
      this.frame
        .locator("button")
        .filter({
          has: this.frame.locator('svg[data-test-id="add-state-btn"]'),
        })
        .first(),
    ];

    let addStateButton = null;
    for (const button of addStateButtons) {
      const count = await button.count();
      if (count > 0) {
        addStateButton = button;
        break;
      }
    }

    if (!addStateButton) {
      throw new Error("Could not find add state button");
    }

    await addStateButton.waitFor({ state: "visible", timeout: 10000 });

    if (existingStates === 0) {
      await addStateButton.click();
    } else {
      await addStateButton.click();
      await this.page.waitForTimeout(200);
      await addStateButton.click();
    }

    await this.page.waitForTimeout(500);

    const nameInput = this.frame.locator('[data-plasmic-prop="variable-name"]');
    await nameInput.waitFor({ state: "visible", timeout: 5000 });

    await nameInput.click();
    await this.page.keyboard.press("Control+a");
    await this.page.keyboard.press("Delete");
    await nameInput.fill(state.name);

    await this.setSelectByLabel("variable-type", state.variableType);

    if (state.isInitValDynamicValue || state.initialValue == null) {
      const propEditorRow = this.frame.locator(
        '[data-test-id="prop-editor-row-initial-value"]'
      );
      await propEditorRow.click({ button: "right" });
      await this.frame.getByText("Use dynamic value").click();
      await this.ensureDataPickerInCustomCodeMode();
      await this.page.waitForTimeout(200);
      await this.insertMonacoCode(
        state.initialValue != null ? state.initialValue : "undefined"
      );
      await this.page.waitForTimeout(200);
    } else {
      if (state.variableType === "number") {
        const initValInput = this.frame.locator(
          '.ant-input-number input[data-plasmic-prop="initial-value"]'
        );
        const initValCount = await initValInput.count();

        if (initValCount > 0) {
          await initValInput.click();
          await this.page.waitForTimeout(200);
          await initValInput.clear();
          await this.page.waitForTimeout(200);
          await initValInput.fill(state.initialValue.toString());
          await this.page.waitForTimeout(200);
        } else {
          await this.setDataPlasmicProp("initial-value", state.initialValue);
        }
      } else {
        await this.setDataPlasmicProp("initial-value", state.initialValue);
      }
    }

    if (state.accessType && state.accessType !== "private") {
      const accessTypeCheckbox = this.frame.locator(
        '[data-test-id="allow-external-access"]'
      );
      await accessTypeCheckbox.click({ timeout: 10000, force: true });
      await this.page.waitForTimeout(200);
      await this.setSelectByLabel("access-type", state.accessType);
    }

    await this.page.waitForTimeout(500);

    const confirmButton = this.frame.locator('[data-test-id="confirm"]');
    await confirmButton.click();
    await this.page.waitForTimeout(2000);
  }

  async pickIntegration(dataSourceId?: string) {
    const pickIntegrationBtn = this.frame.locator(
      "#data-source-modal-pick-integration-btn"
    );

    await pickIntegrationBtn.waitFor({ state: "visible", timeout: 10000 });

    if (await pickIntegrationBtn.isVisible()) {
      await pickIntegrationBtn.click();

      let result = null;

      if (dataSourceId) {
        result = await this.page.evaluate((dsId) => {
          const w = window as any;
          if (w.dbg?.testControls?.dataSource?.setByValue) {
            return w.dbg.testControls.dataSource.setByValue(dsId);
          }
          return null;
        }, dataSourceId);

        if (result !== null) {
          const confirmButton = this.page
            .getByRole("button", { name: "Confirm" })
            .or(
              this.page
                .locator("button")
                .filter({ hasText: /confirm|ok|select/i })
                .first()
            );

          await confirmButton.waitFor({ timeout: 5000 });
          await confirmButton.click();
          await this.page.waitForTimeout(3000);
          return;
        }
      }

      if (result === null) {
        result = await this.page.evaluate(() => {
          const w = window as any;
          if (w.dbg?.testControls?.dataSource?.setByValue) {
            const dataSourceControl = w.dbg.testControls.dataSource;
            if (dataSourceControl.options) {
              for (const option of dataSourceControl.options) {
                if (
                  option.value &&
                  (option.label?.toLowerCase().includes("tutorial") ||
                    option.label?.toLowerCase().includes("tutorialdb") ||
                    option.value.includes("tutorial"))
                ) {
                  return dataSourceControl.setByValue(option.value);
                }
              }
            }
            if (
              dataSourceControl.options &&
              dataSourceControl.options.length > 0
            ) {
              return dataSourceControl.setByValue(
                dataSourceControl.options[0].value
              );
            }
          }
          return null;
        });
      }

      if (result === null) {
        const selectIntegrationBtn = this.page
          .locator("button")
          .filter({
            hasText: "Select an integration from your workspace to use",
          })
          .or(
            this.page
              .locator("button")
              .filter({ hasText: /select.*integration.*workspace/i })
          )
          .or(
            this.page
              .locator("button")
              .filter({ hasText: /select.*integration/i })
          );

        await selectIntegrationBtn.waitFor({ timeout: 10000 });
        await selectIntegrationBtn.click();

        let integrationOption = this.page
          .getByRole("option")
          .filter({ hasText: /Fake Data Source/i })
          .first();

        const foundFakeSource = (await integrationOption.count()) > 0;

        if (!foundFakeSource) {
          integrationOption = this.page
            .getByRole("option")
            .filter({ hasText: /TutorialDB/i })
            .first();
        }

        await integrationOption.waitFor({ timeout: 5000 });
        await integrationOption.click();
      }

      const confirmButton = this.page
        .getByRole("button", { name: "Confirm" })
        .or(
          this.page
            .locator("button")
            .filter({ hasText: /confirm|ok|select/i })
            .first()
        );

      await confirmButton.waitFor({ timeout: 5000 });
      await confirmButton.click();
    } else {
      await this.setDataPlasmicProp("dataSource", "default");
    }
  }

  async addComponentQuery() {
    const addQueryBtn = this.frame.locator("#data-queries-add-btn");
    await addQueryBtn.click();
  }

  async saveDataSourceModal() {
    const saveBtn = this.frame.locator("#data-source-modal-save-btn");
    await saveBtn.click();
  }

  async closeSidebarModal() {
    const closeBtn = this.frame.locator('[data-test-id="close-sidebar-modal"]');
    await closeBtn.click();
  }

  async closePopoverFrame() {
    const closeBtn = this.frame.locator('[data-test-id="close-popover-frame"]');
    await closeBtn.click();
  }

  async saveDataPicker() {
    await this.windowSaveButton.click();
    await this.frame
      .locator('[data-test-id="data-picker"]')
      .waitFor({ state: "detached", timeout: 2000 });
  }

  async clickDataPlasmicProp(propName: string) {
    const prop = this.frame.locator(`[data-plasmic-prop="${propName}"]`);
    await prop.click();
  }

  async renameTreeNode(name: string, options?: { programatically?: boolean }) {
    if (options?.programatically) {
      const nameInput = this.frame.locator(
        '[data-test-id="tree-node-name-input"]'
      );
      await nameInput.fill(name);
      await nameInput.press("Enter");
    } else {
      await this.page.keyboard.type(name);
      await this.page.keyboard.press("Enter");
    }
  }

  async configureSchemaForm(options: {
    formType: "New Entry" | "Update Entry";
    tableName: string;
    lookupField?: string;
    idValue?: string;
  }) {
    const { formType, tableName, lookupField, idValue } = options;

    const formTypeElements = this.frame
      .locator("*")
      .filter({ hasText: "Select the form type" });
    await formTypeElements.first().click();
    const selectElement = this.frame
      .locator("select")
      .filter({ hasText: formType })
      .first();
    await selectElement.selectOption({ label: formType });

    const integrationBtn = this.frame.getByText("Pick an integration");
    await integrationBtn.click();

    const loader = this.page.locator(".loader-container");
    try {
      await loader.waitFor({ state: "visible", timeout: 1000 });
      await loader.waitFor({ state: "detached", timeout: 5000 });
    } catch {}

    const integrationDropdown = this.page
      .getByText("Select an integration from your workspace to use")
      .or(
        this.page
          .locator("select")
          .filter({ hasText: "Select an integration" })
          .first()
      );
    await integrationDropdown.click();
    await this.page.waitForTimeout(500);

    const fakeDataSourceOption = this.page
      .locator("option")
      .filter({ hasText: /Fake.*Data.*Source/i })
      .first();
    const selectEl = this.page.locator("select").first();
    const optionValue = await fakeDataSourceOption.getAttribute("value");
    if (optionValue) {
      await selectEl.selectOption({ value: optionValue });
      await this.page.waitForTimeout(1000);
    }

    const confirmBtn = this.page.locator('[data-test-id="prompt-submit"]');
    await confirmBtn.first().click();
    const unsetButton = this.frame.getByRole("button", { name: "unset" });
    await unsetButton.click({ timeout: 20000 });
    await this.page.waitForTimeout(500);

    const tableOption = this.frame.locator(`option[value*="${tableName}"]`);
    const tableOptionValue = await tableOption.getAttribute("value");
    const tableSelect = this.frame.locator(
      `select:has(option[value*="${tableName}"])`
    );
    if (tableOptionValue && (await tableSelect.count()) > 0) {
      await tableSelect.selectOption({ value: tableOptionValue });
    }

    if (formType === "Update Entry" && lookupField) {
      const lookupDropdown = this.frame
        .getByRole("button", { name: "unset" })
        .nth(1);
      if ((await lookupDropdown.count()) > 0) {
        await lookupDropdown.click();
        await this.page.waitForTimeout(500);

        const fieldOption = this.frame.locator(
          `option[value="${lookupField}"]`
        );
        if ((await fieldOption.count()) > 0) {
          const fieldSelect = this.frame.locator(
            `select:has(option[value="${lookupField}"])`
          );
          await fieldSelect.selectOption({ value: lookupField });
        }
      }

      if (idValue) {
        const idInputCandidates = [
          this.frame.locator('input[placeholder*="id"]'),
          this.frame.locator('input[name*="id"]'),
          this.frame.locator("input").last(),
        ];

        for (const candidate of idInputCandidates) {
          if ((await candidate.count()) > 0) {
            try {
              await candidate.first().clear();
              await candidate.first().fill(idValue);
              break;
            } catch (e) {}
          }
        }
      }
    }

    await this.page.waitForTimeout(2000);

    const saveBtnStudio = this.frame.getByText("Save");
    if ((await saveBtnStudio.count()) > 0) {
      await saveBtnStudio.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async setupComponentQuery(resourceName: string) {
    await this.switchToComponentDataTab();
    await this.addComponentQuery();
    await this.setSelectByLabel(
      "data-source-modal-pick-resource-btn",
      resourceName
    );
    await this.saveDataSourceModal();
  }

  async verifySchemaFormFields(
    expectedFields: string[],
    frame: FrameLocator
  ): Promise<boolean> {
    await this.page.waitForTimeout(3000);

    const results = await Promise.all(
      expectedFields.map((field) => frame.locator(`text=${field}`).count())
    );

    return results.every((count) => count > 0);
  }

  async checkNumberOfStatesInComponent(explicit: number, implicit: number) {
    await this.switchToComponentDataTab();

    const explicitStateRows = this.frame.locator(
      '[data-test-type="variable-row"]'
    );
    await expect(explicitStateRows).toHaveCount(explicit);

    if (!implicit) {
      const showExtraContentButton = this.frame.locator(
        '[data-test-id="variables-section"] [data-test-id="show-extra-content"]'
      );
      await expect(showExtraContentButton).not.toBeVisible();
    } else {
      // Expand the variables section to show implicit states
      const showExtraContentButton = this.frame.locator(
        '[data-test-id="variables-section"] [data-test-id="show-extra-content"]'
      );
      await showExtraContentButton.click();

      const implicitStateRows = this.frame.locator(
        '[data-test-type="implicit-variable-row"]'
      );
      await expect(implicitStateRows).toHaveCount(implicit);
    }
  }
}
