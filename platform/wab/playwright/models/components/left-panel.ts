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
    const addMenuOpen = await this.addContainer.isVisible();
    if (!addMenuOpen) {
      await this.addButton.click({ timeout: 30000 });
      await this.page.waitForTimeout(500);
    }

    await this.addContainer.waitFor({ state: "visible", timeout: 10000 });

    await this.addSearchInput.waitFor({ state: "visible", timeout: 10000 });
    await this.page.waitForTimeout(200);

    await this.addSearchInput.fill(node);

    const item = this.frame
      .locator(`li[data-plasmic-add-item-name="${node}"]`)
      .first();
    await item.waitFor({ state: "visible", timeout: 10000 });

    await item.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(200);

    let itemClicked = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await item.click({ timeout: 5000 });
        itemClicked = true;
        break;
      } catch (error) {
        if (attempt === 2) {
          await item.click({ force: true });
          itemClicked = true;
          break;
        }
        await this.page.waitForTimeout(300);
        await item.scrollIntoViewIfNeeded();
      }
    }

    if (!itemClicked) {
      throw new Error(`Failed to click item "${node}"`);
    }
  }

  async setComponentName(name: string) {
    await this.componentNameInput.waitFor({ state: "visible", timeout: 5000 });
    await this.componentNameInput.fill(name);
    await this.page.waitForTimeout(300);

    await this.componentNameSubmit.waitFor({ state: "visible", timeout: 5000 });
    await this.componentNameSubmit.waitFor({
      state: "attached",
      timeout: 5000,
    });
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

  async addAndSelectNewArtboard() {
    await this.addNewFrame();
    const artboardFrame = this.page
      .locator("iframe")
      .first()
      .contentFrame()
      .locator("iframe")
      .contentFrame()
      .locator("iframe")
      .first()
      .contentFrame();
    const artboardBody = artboardFrame.locator("body");
    await artboardBody.click();
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
    const isActive =
      (await this.treeTabButton.getAttribute("data-state-isselected")) ===
      "true";
    if (!isActive) {
      await this.treeTabButton.click();
    }
  }

  async switchToVersionsTab() {
    const isActive =
      (await this.versionsTabButton.getAttribute("data-state-isselected")) ===
      "true";
    if (!isActive) {
      await this.versionsTabButton.scrollIntoViewIfNeeded();
      await this.versionsTabButton.click({ force: true });
    }
  }

  async switchToImportsTab() {
    const moreTab = this.frame.locator('[data-test-tabkey="more"]');
    await moreTab.waitFor({ state: "visible", timeout: 5000 });
    await moreTab.hover();
    await this.page.waitForTimeout(500);

    const importsTab = this.frame.locator('button[data-test-tabkey="imports"]');
    await importsTab.click();
  }

  async selectTreeNode(names: string[]): Promise<Locator> {
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const label = this.treeLabels.filter({ hasText: name }).first();
      await label.waitFor({ timeout: 5000 });

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
