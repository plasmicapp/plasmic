import { FrameLocator, Locator, Page } from "playwright/test";
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
    // These timeouts are necessary.
    // Sometimes, clicking the dropdown button will briefly open the dropdown, but after a small amount of time it gets closed
    // Checking without this timeout will cause the check to fail, but by the time it tries to do any other operation, the dropdown will have closed
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

      // TODO: Monaco editor input is unreliable with pressSequentially - sometimes skips letters.
      // Consider trying page.keyboard.type after focusing the editor or other workarounds.
      // See: https://stackoverflow.com/questions/69375890/how-to-insert-code-in-monaco-editor-using-playwright
      await this.valueCodeInput.pressSequentially(interaction.args.value);
      const modifierKey = process.platform === "darwin" ? "Meta" : "Control";
      while (
        (await this.valueCodeInput.innerText()) != interaction.args.value
      ) {
        await this.valueCodeInput.press(`${modifierKey}+A`);
        await this.valueCodeInput.press("Delete");
        await this.valueCodeInput.pressSequentially(interaction.args.value);
      }
      await this.windowSaveButton.click();
    }

    await this.closeSidebarButton.click();
  }
}
