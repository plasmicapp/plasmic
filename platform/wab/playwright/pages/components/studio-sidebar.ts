import { FrameLocator, Locator, Page } from "playwright/test";
import { BasePage } from "../base-page";

export class StudioSidebar extends BasePage {
  readonly frame: FrameLocator = this.page
    .frameLocator("iframe.studio-frame")
    .frameLocator("iframe");
  readonly addInteractionButton: Locator = this.frame.locator(
    '[data-test-id="add-interaction"]'
  );
  readonly interactionsSearchInput: Locator = this.frame.locator(
    "#interactions-select"
  );
  readonly actionsDropdownButton: Locator = this.frame.locator(
    '[data-plasmic-prop="action-name"]'
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

  async getStateVariable(stateVar: string): Promise<Locator> {
    const stateVariable = this.frame
      .locator(`[data-test-id="0-${stateVar}"]`)
      .first();
    return stateVariable;
  }

  async addInteraction(
    eventHandler: string,
    interaction: {
      actionName: string;
      args: {
        variable: string[];
        operation: "newValue" | "clearValue";
        value?: string;
      };
    }
  ) {
    await this.addInteractionButton.click();
    await this.interactionsSearchInput.fill(eventHandler);
    const interactionsEventDropdownElement =
      await this.selectInteractionEventById(eventHandler);
    await interactionsEventDropdownElement.scrollIntoViewIfNeeded();
    await interactionsEventDropdownElement.click();

    await this.actionsDropdownButton.first().click();
    await (await this.getElementWithDataKey(interaction.actionName)).click();
    if (interaction.args.variable) {
      await this.stateButton.click();
      await (await this.getStateVariable(interaction.args.variable[0])).click();
      await this.windowSaveButton.click();
    }
    if (interaction.args.operation) {
      await this.operationDropdownButton.click();
      let operationIntValue: number;
      switch (interaction.args.operation) {
        case "newValue": {
          operationIntValue = 0;
          break;
        }
        case "clearValue": {
          operationIntValue = 1;
          break;
        }
      }
      await this.frame.locator(`[data-key="${operationIntValue}"]`).click();
    }
    if (interaction.args.value) {
      await this.valueButton.click();
      await this.valueCodeInput.pressSequentially(interaction.args.value);
      await this.windowSaveButton.click();
    }

    await this.closeSidebarButton.click();
  }
}
