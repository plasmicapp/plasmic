import { FrameLocator, Locator, Page } from "playwright/test";

export class StudioSidebar {
  readonly frame: FrameLocator;
  readonly addInteractionButton: Locator;
  readonly interactionsSearchInput: Locator;
  readonly actionsDropdownButton: Locator;
  readonly stateButton: Locator;
  readonly windowSaveButton: Locator;
  readonly operationDropdownButton: Locator;
  readonly valueButton: Locator;
  readonly valueCodeInput: Locator;
  readonly closeSidebarButton: Locator;

  constructor(private readonly page: Page) {
    this.frame = this.page
      .frameLocator("iframe.studio-frame")
      .frameLocator("iframe");
    this.addInteractionButton = this.frame.locator(
      '[data-test-id="add-interaction"]'
    );
    this.interactionsSearchInput = this.frame.locator("#interactions-select");
    this.actionsDropdownButton = this.frame.locator(
      '[data-plasmic-prop="action-name"]'
    );
    this.stateButton = this.frame.locator('[data-plasmic-prop="variable"]');
    this.windowSaveButton = this.frame
      .locator('[data-test-id="data-picker"]')
      .locator("text=Save");

    this.operationDropdownButton = this.frame.locator(
      '[data-plasmic-prop="operation"]'
    );
    this.valueButton = this.frame.locator('[data-plasmic-prop="value"]');
    this.valueCodeInput = this.frame.locator(
      "div.react-monaco-editor-container"
    );
    this.closeSidebarButton = this.frame.locator(
      '[data-test-id="close-sidebar-modal"]'
    );
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
