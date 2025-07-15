import { FrameLocator, Locator, Page } from "playwright/test";

import { BasePage } from "./base-page";
import { Interaction } from "../types/interaction";

export class ProjectPage extends BasePage {
  readonly frame = this.page
    .frameLocator("iframe.studio-frame")
    .frameLocator("iframe");
  readonly projectNavButton = this.frame.locator('[id="proj-nav-button"]');
  readonly projectNavClearSearchButton = this.frame.locator(
    '[data-test-id="nav-dropdown-clear-search"]'
  );
  readonly projectNavSearchInput = this.frame.locator(
    '[data-test-id="nav-dropdown-search-input"]'
  );
  readonly addInteractionButton = this.frame.locator(
    '[data-test-id="add-interaction"]'
  );
  readonly interactionsSearchInput = this.frame.locator("#interactions-select");
  readonly actionsDropdownButton = this.frame.locator(
    '[data-plasmic-prop="action-name"]'
  );
  readonly stateButton = this.frame.locator('[data-plasmic-prop="variable"]');
  readonly windowSaveButton = this.frame
    .locator('[data-test-id="data-picker"]')
    .locator("text=Save");

  readonly operationDropdownButton = this.frame.locator(
    '[data-plasmic-prop="operation"]'
  );
  readonly valueButton = this.frame.locator('[data-plasmic-prop="value"]');
  readonly valueCodeInput = this.frame.locator(
    "div.react-monaco-editor-container"
  );
  readonly closeSidebarButton = this.frame.locator(
    '[data-test-id="close-sidebar-modal"]'
  );
  readonly enterLiveModeButton = this.frame.locator(
    '[data-test-id="enter-live-mode-btn"]'
  );
  readonly liveFrame = this.page
    .locator("iframe")
    .first()
    .contentFrame()
    .locator("iframe")
    .contentFrame()
    .locator('[data-test-id="live-frame"]')
    .contentFrame();

  readonly exitLiveModeButton = this.frame.locator(
    '[data-test-id="exit-live-mode-btn"]'
  );

  constructor(page: Page) {
    super(page);
  }

  async selectInteractionEventById(eventHandler: string): Promise<Locator> {
    const dropdownElement = this.frame.locator(
      `#interactions-select-opt-${eventHandler}`
    );
    return dropdownElement;
  }

  async selectElementWithDataKey(key: string): Promise<Locator> {
    const element = this.frame.locator(`[data-key="${key}"]`);
    return element;
  }

  async getInteractionAction(actionName: string): Promise<Locator> {
    const interactionAction = await this.selectElementWithDataKey(actionName);
    return interactionAction;
  }

  async getStateVariable(stateVar: string): Promise<Locator> {
    const stateVariable = this.frame
      .locator(`[data-test-id="0-${stateVar}"]`)
      .first();
    return stateVariable;
  }

  async switchArena(name: string) {
    await this.projectNavButton.click({ force: true });
    if (await this.projectNavClearSearchButton.isVisible()) {
      await this.projectNavClearSearchButton.click({ force: true });
    }
    await this.projectNavSearchInput.fill(name);
    await this.frame.locator(`text=${name}`).click({ force: true });
    await this.page.waitForTimeout(1000);
  }

  async addInteraction(eventHandler: string, interaction: Interaction) {
    await this.addInteractionButton.click();
    await this.interactionsSearchInput.fill(eventHandler);
    const interactionsEventDropdownElement =
      await this.selectInteractionEventById(eventHandler);
    await interactionsEventDropdownElement.scrollIntoViewIfNeeded();
    await interactionsEventDropdownElement.click();

    await this.actionsDropdownButton.first().click();
    await (await this.getInteractionAction(interaction.actionName)).click();
    if (interaction.args.variable) {
      await this.stateButton.click();
      await (await this.getStateVariable(interaction.args.variable[0])).click();
      await this.windowSaveButton.click();
    }
    if (interaction.args.operation) {
      await this.operationDropdownButton.click();
      await this.frame
        .locator(`[data-key="${interaction.args.operation}"]`)
        .click();
    }
    if (interaction.args.value) {
      await this.valueButton.click();
      await this.valueCodeInput.pressSequentially(interaction.args.value);
      await this.windowSaveButton.click();
    }

    await this.closeSidebarButton.click();
  }

  async withinLiveMode(fn: (liveFrame: FrameLocator) => Promise<void>) {
    await this.enterLiveModeButton.click({ force: true });
    await fn(this.liveFrame);
    await this.exitLiveModeButton.click({ force: true });
  }
}
