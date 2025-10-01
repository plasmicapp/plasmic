import { expect, FrameLocator, Locator, Page } from "playwright/test";
import { BaseModel } from "../BaseModel";

export class LeftPanel extends BaseModel {
  readonly frame: FrameLocator = this.page
    .frameLocator("iframe.studio-frame")
    .frameLocator("iframe");

  readonly addContainer: Locator = this.frame.locator(
    '[data-test-id="add-drawer"]'
  );

  readonly addButton: Locator = this.frame.locator(
    `[data-test-id="add-button"]`
  );

  readonly addSearchInput: Locator = this.addContainer.locator("input");

  readonly componentNameInput: Locator = this.frame.locator(
    '[data-test-id="prompt"]'
  );
  readonly componentNameSubmit: Locator = this.frame.locator(
    '[data-test-id="prompt-submit"]'
  );
  readonly breakpointPresetButton: Locator = this.frame.locator(
    "text=Start with a preset"
  );
  readonly breakpointDesktopCategory: Locator =
    this.frame.locator("text=Desktop first");
  readonly breakpointDesktopMobile: Locator = this.frame.locator(
    "text=Desktop, Mobile"
  );
  readonly breakpointWidthInput: Locator = this.frame.locator(
    "input[placeholder='Max width']"
  );
  readonly assetsTabButton: Locator = this.frame.locator(
    '[data-test-tabkey="assets"]'
  );
  readonly componentsTabButton: Locator = this.frame.locator(
    '[data-test-tabkey="components"]'
  );
  readonly editComponentButton: Locator =
    this.frame.getByText("Edit component");
  readonly treeTabButton: Locator = this.frame.locator(
    'button[data-test-tabkey="outline"]'
  );
  readonly versionsTabButton: Locator = this.frame.locator(
    'button[data-test-tabkey="versions"]'
  );
  readonly moreTabButton: Locator = this.frame.locator(
    'button[data-test-tabkey="more"]'
  );
  readonly treeRoot: Locator = this.frame.locator(".tpltree__root");
  readonly treeLabels: Locator = this.frame.locator(".tpltree__label");
  readonly treeNodeExpander: Locator = this.frame.locator(
    '.tpltree__label__expander[data-state-isopen="false"]'
  );
  readonly focusedTreeNode: Locator = this.frame.locator(
    ".tpltree__label--focused"
  );
  readonly leftPanelIndicator: Locator = this.frame.locator(
    '[data-test-class="left-panel-indicator"] > div'
  );
  readonly indicatorClear: Locator = this.frame.locator(
    '[data-test-class="indicator-clear"]'
  );

  constructor(page: Page) {
    super(page);
  }

  async insertNode(node: string) {
    try {
      await this.addButton.click({ timeout: 10000 });
    } catch (error) {
      await this.addButton.click({ force: true });
    }

    await this.page.waitForTimeout(500);
    await this.addSearchInput.fill(node);
    await this.page.waitForTimeout(500);

    const item = this.frame
      .locator(`li[data-plasmic-add-item-name="${node}"]`)
      .first();
    await item.waitFor({ state: "visible", timeout: 10000 });

    try {
      await item.click({ timeout: 10000 });
    } catch (error) {
      await item.click({ force: true });
    }
  }

  async setComponentName(name: string) {
    await this.componentNameInput.waitFor({ state: "visible", timeout: 5000 });
    await this.componentNameInput.fill(name);
    await this.page.waitForTimeout(1000);

    await this.componentNameSubmit.waitFor({ state: "visible", timeout: 5000 });
    await this.componentNameSubmit.click();
  }

  async addComponent(name: string) {
    await this.insertNode("New component");
    await this.setComponentName(name);
  }

  async addPage(name: string) {
    await this.insertNode("New page");
    await this.setComponentName(name);
  }

  async createNewPage(name: string) {
    await this.insertNode("New page");
    await this.setComponentName(name);
  }

  async addNewFrame() {
    await this.insertNode("New scratch artboard");
  }

  async setBreakpointWidth(width: string) {
    await this.breakpointWidthInput.click();
    await this.breakpointWidthInput.clear();
    await this.breakpointWidthInput.fill(width);
  }

  async insertText() {
    await this.insertNode("Text");
  }

  async editComponentWithName(componentName: string) {
    await this.assetsTabButton.hover();
    await this.componentsTabButton.click();
    await this.frame
      .locator(`[data-test-id="listitem-component-${componentName}"]`)
      .click({ button: "right" });
    await this.editComponentButton.click();
  }

  async expectDebugTplTree(expected: string[] | string) {
    const tree = await this.frame.locator("body").evaluate(() => {
      const win = window as any;
      const vc = win.dbg.studioCtx.focusedViewCtx();
      return vc.tplMgr().debugDumpTree(vc.tplRoot());
    });

    if (typeof expected === "string") {
      expect(tree.trim()).toBe(expected.trim());
    } else {
      const treeLines = tree
        .split("\n")
        .filter((line: string) => line.trim().length > 0)
        .map((line: string) => {
          return line.trim();
        });

      expect(treeLines.length).toBe(expected.length);
      for (let i = 0; i < expected.length; i++) {
        expect(treeLines[i]).toBe(expected[i]);
      }
    }
  }

  async switchToComponentsTab() {
    await this.assetsTabButton.hover();
    await this.componentsTabButton.click();
  }

  async switchToTreeTab() {
    // Check if the tree tab is already active by looking at the aria-selected attribute
    const isActive =
      (await this.treeTabButton.getAttribute("data-state-isselected")) ===
      "true";
    if (!isActive) {
      await this.treeTabButton.click();
    }
  }

  async switchToVersionsTab() {
    // Check if the versions tab is already active by looking at the aria-selected attribute
    const isActive =
      (await this.versionsTabButton.getAttribute("data-state-isselected")) ===
      "true";
    if (!isActive) {
      await this.versionsTabButton.click();
    }
  }

  async switchToImportsTab() {
    const importsTab = this.frame.locator('button[data-test-tabkey="imports"]');
    // Check if the imports tab is already active by looking at the aria-selected attribute
    const isActive =
      (await importsTab.getAttribute("data-state-isselected")) === "true";
    if (!isActive) {
      await importsTab.click();
    }
  }

  async selectTreeNode(names: string[]): Promise<Locator> {
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const label = this.treeLabels.filter({ hasText: name }).first();
      await label.waitFor();

      if (i < names.length - 1) {
        const expander = label.locator(
          '.tpltree__label__expander[data-state-isopen="false"]'
        );
        if (await expander.isVisible()) {
          await expander.click();
          await this.page.waitForTimeout(500);
        }
      }
    }

    const finalLabel = this.treeLabels
      .filter({ hasText: names[names.length - 1] })
      .first();
    await finalLabel.click();
    return finalLabel;
  }

  async hoverLeftPanelIndicator() {
    await this.leftPanelIndicator.hover();
  }

  async clearAllIndicators() {
    const indicators = this.indicatorClear;
    const count = await indicators.count();
    for (let i = 0; i < count; i++) {
      await indicators.nth(i).click({ force: true });
    }
  }
}
