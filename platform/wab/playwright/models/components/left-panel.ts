import { expect, FrameLocator, Locator, Page } from "playwright/test";
import { test } from "../../fixtures/test";
import { BaseModel } from "../BaseModel";

export interface TestDataToken {
  name: string;
  type: string;
  value: string;
  evaluatedValue?: string;
  depName?: string;
  nestedPath?: string[];
}

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

  readonly leftPane = this.frame.locator(".canvas-editor__left-pane");

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
  readonly dataTokensTabButton: Locator = this.frame.locator(
    '[data-test-tabkey="dataTokens"]'
  );

  readonly newDataTokenButton: Locator = this.frame.locator(
    '[data-test-id="new-data-token-button"]'
  );
  readonly dataTokensPanelContent: Locator = this.frame.locator(
    '[data-test-id="data-tokens-panel-content"]'
  );

  readonly sidebarModal: Locator = this.frame.locator('[id="sidebar-modal"]');
  readonly closeSidebarModalButton: Locator = this.frame.locator(
    '[data-test-id="close-sidebar-modal"]'
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

  constructor(page: Page) {
    super(page);
  }

  async insertNode(node: string) {
    const addMenuOpen = await this.addContainer.isVisible();
    if (!addMenuOpen) {
      await this.addButton.click({ timeout: 30000 });
      await this.page.waitForTimeout(500);
    }
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
        console.error(`Failed to insert ${node}:`, error);
        await this.page.waitForTimeout(300);
        if (!(await this.addContainer.isVisible())) {
          // TODO - it is possible for the click to go through but still throw an error,
          // need to investigate further how this happens.
          itemClicked = true;
          break;
        }
        if (attempt === 2) {
          await item.click({ force: true });
          itemClicked = true;
          break;
        }
      }
    }

    if (!itemClicked) {
      throw new Error(`Failed to click item "${node}"`);
    }
  }

  async assertDataTokenExists(name: string) {
    await test.step(`Assert data token ${name} exists`, async () => {
      await this.switchToDataTokensTab();
      await this.frame
        .locator("[class*='DataTokensPanel'] [class*='LeftSearchPanel'] input")
        .fill(name);
      await expect(this.dataTokensPanelContent.getByText(name)).toBeVisible();
    });
  }

  async createNewDataToken({ name, type, value }: TestDataToken) {
    await test.step(`Create data token ${name}: ${type} = ${value}`, async () => {
      await this.switchToDataTokensTab();
      await this.newDataTokenButton.click();
      await this.page.keyboard.type(name);
      await this.page.keyboard.press("Tab"); // focuses close button, so tab again
      await this.page.keyboard.press("Tab");
      await this.page.keyboard.type(type);
      if (type === "code") {
        await this.sidebarModal.locator(".code-editor-input").click();
        await this.sidebarModal.locator(".monaco-editor").waitFor();

        await this.page.keyboard.press("Control+A");
        await this.page.keyboard.press("Delete");
        await this.page.keyboard.press("Backspace");
        await this.page.keyboard.type(value);
        await this.sidebarModal.locator('[data-test-id="save-code"]').click();
        await this.sidebarModal
          .locator(".monaco-editor")
          .waitFor({ state: "hidden" });

        await this.closeSidebarModalButton.click();
      } else {
        await this.page.keyboard.press("Tab");
        await this.page.keyboard.type(value);
        await this.page.keyboard.press("Enter");
      }
    });
  }

  async setComponentName(name: string) {
    const componentNameInput = this.frame.locator('[data-test-id="prompt"]');
    await componentNameInput.click({ trial: true });
    await componentNameInput.fill(name);
    await this.page.waitForTimeout(300);

    await this.componentNameSubmit.click({ trial: true });
    await this.componentNameSubmit.click();
  }

  async addComponent(name: string) {
    await this.insertNode("New component");
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

  async switchToDataTokensTab() {
    await this.assetsTabButton.hover();
    const isActive =
      (await this.dataTokensTabButton.getAttribute("data-state-isselected")) ===
      "true";
    if (!isActive) {
      await this.dataTokensTabButton.click();
    } else {
      await this.addButton.hover(); // to blur the assets tab button
    }
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
      await this.versionsTabButton.click();
    }
  }

  async switchToImportsTab() {
    const moreTab = this.frame.locator('[data-test-tabkey="more"]');
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
}
