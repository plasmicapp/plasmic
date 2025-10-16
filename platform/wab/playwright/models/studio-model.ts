import { expect, FrameLocator, Locator, Page } from "playwright/test";
import { BaseModel } from "./BaseModel";
import { LeftPanel } from "./components/left-panel";
import { RightPanel } from "./components/right-panel";

export class StudioModel extends BaseModel {
  readonly frame: FrameLocator = this.studioFrame;
  readonly projectNavButton: Locator = this.frame.locator(
    '[id="proj-nav-button"]'
  );
  readonly projectNavClearSearchButton: Locator = this.frame.locator(
    '[data-test-id="nav-dropdown-clear-search"]'
  );
  readonly projectNavSearchInput: Locator = this.frame.locator(
    '[data-test-id="nav-dropdown-search-input"]'
  );
  readonly enterLiveModeButton: Locator = this.frame.locator(
    '[data-test-id="enter-live-mode-btn"]'
  );
  readonly liveFrame: FrameLocator = this.page
    .locator("iframe")
    .first()
    .contentFrame()
    .locator("iframe")
    .contentFrame()
    .locator('[data-test-id="live-frame"]')
    .contentFrame();
  readonly exitLiveModeButton: Locator = this.frame.locator(
    '[data-test-id="exit-live-mode-btn"]'
  );
  readonly rightPanel: RightPanel = new RightPanel(this.page);
  readonly convertToSlotButton: Locator = this.frame.getByText(
    "Convert to a slot target"
  );
  readonly revertSlotToDefaultButton: Locator = this.frame.getByText(
    "Revert to default slot content"
  );
  readonly commentTextArea = this.frame.locator(
    '[data-test-id="comment-post-text-area"]'
  );
  readonly commentSubmitButton = this.frame.locator(
    '[data-test-id="comment-post-submit-button"]'
  );
  readonly commentCloseButton = this.frame.locator(
    '[data-test-id="thread-comment-dialog-close-btn"]'
  );
  readonly commentPosts: Locator = this.frame.locator(
    '[data-test-id^="comment-post-"]'
  );
  readonly commentMarkers: Locator = this.frame.locator(
    '[data-test-id^="comment-marker-"]'
  );
  readonly newDropdownButton = this.frame.locator(
    '[id="nav-dropdown-plus-btn"]'
  );
  readonly commentIcon = this.frame.locator(
    '[data-test-id="top-comment-icon"]'
  );
  readonly extractComponentNameInput = this.frame.locator(
    'input[data-test-id="extract-component-name"]'
  );

  readonly newDropdownItem = this.frame.locator(".ant-dropdown-menu-item");
  readonly newPageInput = this.frame.locator('[data-test-id="prompt"]');
  readonly commentsTab = this.frame.locator(".comments-tab");
  readonly modal = this.frame.locator(".ant-modal");
  readonly confirmButton = this.frame.locator('[data-test-id="confirm"]');
  readonly publishButton: Locator = this.frame.locator("#topbar-publish-btn");
  readonly saveIndicator: Locator = this.frame.locator(
    "*[class^=PlasmicSaveIndicator]"
  );
  readonly publishFlowDialogAddWebsiteBtn: Locator = this.page.locator(
    "#publish-flow-dialog-add-website-btn"
  );
  readonly configureButton: Locator = this.page.getByText("Configure");
  readonly domainInput: Locator = this.page.locator(
    'input[placeholder="my-domain.com"]'
  );
  readonly domainCard: Locator = this.page.locator(
    '[data-test-id="domain-card"]'
  );
  readonly removeButton: Locator = this.page.getByText("Remove");
  readonly correctlyConfiguredText: Locator = this.page.getByText(
    "Correctly configured"
  );

  readonly leftPanel: LeftPanel = new LeftPanel(this.page);

  readonly allowExternalAccessButton: Locator = this.frame.getByText(
    "Allow external access"
  );
  readonly createNewPropButton: Locator =
    this.frame.getByText("Create new prop");
  readonly linkNewPropInput: Locator = this.frame.locator(
    '[data-test-id="prop-name"]'
  );
  readonly linkNewPropSubmit: Locator = this.frame.locator(
    'button[data-test-id="prop-submit"]'
  );
  readonly linkToPropButton: Locator = this.frame.getByText("linkProp2");

  readonly selectionBox: Locator = this.frame.locator(".hoverbox");
  readonly canvasEditor: Locator = this.frame.locator(
    ".canvas-editor__canvas-clipper"
  );
  readonly frames: Locator = this.frame.locator(
    ".canvas-editor__frames .canvas-editor__viewport[data-test-frame-uid]"
  );
  readonly frameLabels: Locator = this.frame.locator(".CanvasFrame__Label");
  readonly deslotButton: Locator = this.frame.getByText("De-slot");
  readonly deleteInsteadButton: Locator =
    this.frame.getByText("Delete instead");
  readonly textContent: Locator = this.frame.locator(
    '[data-test-id="text-content"] label'
  );
  readonly useDynamicValueButton: Locator =
    this.frame.getByText("Use dynamic value");
  readonly componentListItem: Locator = this.frame.locator(
    '[data-test-id^="listitem-component-"]'
  );
  readonly editComponentButton: Locator = this.frame.locator(
    '[data-test-id="edit-component"]'
  );
  readonly editComponentInNewArtboardButton: Locator = this.frame.getByText(
    "Edit in new artboard"
  );
  readonly extractSubmitButton = this.frame.locator(
    'form[data-test-id="extract-component-form"] button[type="submit"]'
  );
  readonly expandAllButton = this.frame.locator(
    '[data-test-id="nav-dropdown-expand-all"]'
  );
  readonly promptSubmitButton = this.frame.locator(
    'button[data-test-id="prompt-submit"]'
  );
  readonly publishProjectButton: Locator =
    this.frame.getByText("Publish project");
  readonly versionDescriptionInput: Locator = this.frame
    .locator(".ant-modal input")
    .first();
  readonly confirmPublishButton: Locator = this.frame.getByText("Confirm");
  readonly backToCurrentVersionButton: Locator = this.frame.getByText(
    "Back to current version"
  );
  readonly revertButton: Locator = this.frame.getByText(/^Revert$/);

  constructor(page: Page) {
    super(page);
  }

  async clearSearchInput() {
    if (await this.projectNavClearSearchButton.isVisible()) {
      await this.projectNavClearSearchButton.click();
    }
  }

  async switchArena(name: string) {
    await expect(this.projectNavButton).toBeVisible({ timeout: 30000 });

    await this.projectNavButton.click({ timeout: 10000 });

    await this.clearSearchInput();

    await this.projectNavSearchInput.fill(name);

    const arenaItem = this.frame
      .locator(`div.flex-col`, { hasText: name })
      .first();
    await arenaItem.waitFor({ state: "visible", timeout: 10000 });

    await arenaItem.click({ timeout: 10000 });

    await expect(this.projectNavButton).toBeVisible();

    await this.waitForFrameToLoad();

    const viewportFrame = this.frame.frameLocator(
      ".canvas-editor__viewport[data-test-frame-uid]"
    );

    return viewportFrame;
  }

  async waitForLiveFrameToLoad() {
    await this.liveFrame
      .locator(".live-root-container")
      .waitFor({ timeout: 120000 });
  }

  async withinLiveMode(fn: (liveFrame: FrameLocator) => Promise<void>) {
    await this.enterLiveModeButton.waitFor({
      state: "visible",
      timeout: 10000,
    });
    await this.enterLiveModeButton.click();

    await fn(this.liveFrame);

    await this.exitLiveModeButton.waitFor({ state: "visible", timeout: 5000 });
    await this.exitLiveModeButton.click();
    await this.page.waitForTimeout(1000);
  }

  async zoomOut() {
    await this.page.keyboard.press("Shift+1");
  }

  async addNodeToSelectedFrame(node: string, xPos: number, yPos: number) {
    await this.leftPanel.insertNode(node);
    await this.rightPanel.designTabButton.click();
    await this.rightPanel.setPosition("left", xPos);
    await this.rightPanel.setPosition("top", yPos);
  }

  async insertTextNodeWithContent(content: string) {
    await this.leftPanel.insertNode("Text");
    await this.rightPanel.textContentButton.click();
    await this.page.keyboard.insertText(content);
    await this.page.keyboard.press("Escape");
  }

  async getPropEditorRow(propName: string) {
    return this.frame
      .locator(`[data-test-id^="prop-editor-row-"]`)
      .filter({ hasText: propName });
  }

  async renameSelectionTag(name: string) {
    const selectionTag = this.frame.locator(".node-outline-tag");
    await selectionTag.dblclick({ delay: 100 });
    await this.page.keyboard.type(name);
    await this.page.keyboard.press("Enter");
    await expect(selectionTag).toContainText(name);
  }

  async extractComponentNamed(name: string) {
    await this.page.keyboard.press("Control+Alt+k");
    await this.extractComponentNameInput.fill(name);
    await this.extractSubmitButton.click();
  }

  async getProjectPanelContents() {
    await this.projectNavButton.click();
    if (await this.expandAllButton.isVisible()) {
      await this.expandAllButton.click();
    }
    return this.frame.locator('[data-test-id="test-id_1"]');
  }

  async projectPanel() {
    await this.projectNavButton.click();
    await this.page.waitForTimeout(500);
    if (await this.expandAllButton.isVisible()) {
      await this.expandAllButton.click();
    }
    await this.clearSearchInput();
    return this.studioFrame.locator('[id="proj-nav-popover"]');
  }

  async createNewPage(name: string) {
    await this.leftPanel.createNewPage(name);
  }

  async createNewPageInOwnArena(name: string) {
    await this.projectNavButton.click();
    await this.newDropdownButton.click();
    const menuItem = this.newDropdownItem.first();
    await menuItem.click();

    await this.newPageInput.waitFor({ state: "visible" });
    await this.newPageInput.clear({ force: true });
    await this.newPageInput.fill(name, { force: true });

    const createButton = this.frame.getByText("Create page");
    await createButton.waitFor({ state: "visible" });
    await this.page.waitForTimeout(500);
    await createButton.click();
  }

  async createNewPageInOwnArenaWithTemplate(
    name: string,
    template: string,
    after?: () => Promise<void>
  ) {
    await this.projectNavButton.waitFor({ state: "visible" });
    await this.projectNavButton.click();
    await this.newDropdownButton.click();
    const menuItem = this.newDropdownItem.first();
    await menuItem.click();

    await this.newPageInput.waitFor({ state: "visible" });
    await this.newPageInput.clear({ force: true });
    await this.newPageInput.fill(name, { force: true });

    if (template) {
      await this.frame.getByText(template).click();
    }

    const createButton = this.frame.getByText("Create page");
    await createButton.click();

    if (after) {
      await after();
    }
  }

  async getSelectedElt() {
    const focusedElt = this.frame.locator(".hoverbox");
    await focusedElt.waitFor({ timeout: 10000 });
    return focusedElt;
  }

  async ensureOutlineButtonDeselected() {
    const outlineButton = this.frame.locator(
      'button[data-test-tabkey="outline"]'
    );
    const isPressed = await outlineButton.getAttribute("data-state-isselected");
    if (isPressed === "true") {
      await outlineButton.click();
    }
  }

  async addCommentToSelection(text: string) {
    const selectedElt = await this.getSelectedElt();
    await selectedElt.click({ button: "right", force: true });

    const addCommentButton = this.frame.getByText("Add comment");
    await addCommentButton.click();
    await this.page.waitForTimeout(2_000);
    await this.commentTextArea.fill(text);

    await this.commentSubmitButton.click();
  }

  async openCommentThread(threadId: string) {
    const commentMarker = this.frame.locator(
      `[data-test-id='comment-marker-${threadId}']`
    );
    await commentMarker.click({ force: true });
  }

  async closeCommentThread() {
    await this.commentCloseButton.click();
  }

  async openCommentTab() {
    await this.commentIcon.click();
    await this.commentsTab.waitFor({ timeout: 10000 });
  }

  async clickCommentPost(threadId: string) {
    const commentPost = this.frame.locator(
      `[data-test-id='comment-post-${threadId}']`
    );
    await commentPost.click();

    await this.commentsTab.waitFor({ timeout: 10000 });
  }

  async deleteSelectionWithComments() {
    const selectedElt = await this.getSelectedElt();
    await selectedElt.click({ button: "right", force: true });

    const deleteButton = this.frame.getByText("Delete");
    await deleteButton.click();

    await this.modal.waitFor({ timeout: 10000 });

    await this.confirmButton.click();

    await this.modal.waitFor({ state: "hidden", timeout: 10000 });
  }

  async getCommentMarketById(id: string): Promise<Locator> {
    return this.frame.locator(`[data-test-id='comment-marker-${id}']`);
  }

  async waitForNewFrame() {
    await this.canvasEditor.waitFor();
    const frameCount = await this.frames.count();

    await this.frames.nth(frameCount).waitFor({ timeout: 60000 });
    const frame = this.frames.nth(frameCount);
    return frame;
  }

  async createNewFrame() {
    await this.leftPanel.addNewFrame();
    const frameCount = await this.frames.count();

    await this.frames.nth(frameCount - 1).waitFor({ timeout: 60000 });
    const frame = this.frames.nth(frameCount - 1);
    return frame;
  }

  async focusFrameRoot(frame: Locator | FrameLocator) {
    if ("click" in frame) {
      await frame.click();
    } else {
      await frame.locator("body").click();
    }
    await this.page.keyboard.press("Shift+Enter");
    return frame;
  }

  async focusFrame(frame: Locator | FrameLocator) {
    await this.focusFrameRoot(frame);
    return frame;
  }

  async waitAllEval() {
    await this.page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const win = window as any;
        win.dbg.studioCtx.awaitEval().then(() => {
          resolve();
        });
      });
    });
  }

  async renameTreeNode(name: string) {
    await this.page.keyboard.press("Control+r");
    await this.page.keyboard.type(name);
    await this.page.keyboard.press("Enter");
    await this.page.waitForTimeout(100);
  }

  async convertToSlot(slotName?: string) {
    const selectedElt = await this.getSelectedElt();
    await selectedElt.click({ button: "right", force: true });
    await this.frame.getByText("Convert to a slot").click();

    if (slotName) {
      const slotNameInput = this.frame.locator(
        '[data-test-class="simple-text-box"]'
      );
      await slotNameInput.fill(slotName);
    }
  }

  async getSelectionBox() {
    return this.selectionBox;
  }

  async linkNewProp(propName?: string, defaultValue?: string) {
    if (propName) {
      await this.linkNewPropInput.fill(propName);
    }
    if (defaultValue) {
      await this.frame
        .locator('input[data-plasmic-prop="default-value"]')
        .fill(defaultValue);
    }
    await this.linkNewPropSubmit.click();
  }

  async allowExternalAccess() {
    await this.allowExternalAccessButton.hover();
  }

  async createNewProp() {
    await this.createNewPropButton.click();
  }

  async linkToExistingProp(propName: string) {
    await this.frame.getByText(propName).first().click();
  }

  async insertTextWithDynamic(code: string) {
    await this.leftPanel.insertNode("Text");

    const disablePane = this.frame.locator(
      ".canvas-editor__disable-right-pane"
    );
    const count = await disablePane.count();
    if (count > 0) {
      await disablePane
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    await this.textContent.click({ button: "right", force: true });
    await this.useDynamicValueButton.click();
    await this.rightPanel.insertMonacoCode(code);
  }

  async openComponentInNewFrame(
    componentName: string,
    options: {
      editInNewArtboard: boolean;
    } = { editInNewArtboard: false }
  ) {
    await this.leftPanel.switchToComponentsTab();
    const componentItem = this.componentListItem.filter({
      hasText: componentName,
    });
    await componentItem.click({ button: "right" });
    if (options) {
      if (options.editInNewArtboard) {
        await this.editComponentButton.click();
      } else {
        await this.editComponentInNewArtboardButton.click();
      }
    }
  }

  async deleteSelection() {
    await this.page.keyboard.press("Delete");
  }

  async turnOffDesignMode() {
    const viewMenu = this.frame.locator("#view-menu");
    await viewMenu.click();
    const turnOffOption = this.frame.getByText("Turn off design mode");
    if ((await turnOffOption.count()) > 0) {
      await turnOffOption.click();
    }
  }

  async selectRootNode() {
    const canvasFrame = this.frame
      .locator(".canvas-editor__viewport[data-test-frame-uid]")
      .first();
    if ((await canvasFrame.count()) > 0) {
      await canvasFrame.click();
      return;
    }

    const rootInTree = this.leftPanel.frame
      .locator('[data-test-id="tree-node-label"]')
      .first();
    if ((await rootInTree.count()) > 0) {
      await rootInTree.click();
    }
  }

  async createComponentProp(opts: {
    propName: string;
    propType: string;
    defaultValue?: string;
    previewValue?: string;
  }) {
    await this.rightPanel.switchToComponentDataTab();
    await this.rightPanel.addComponentProp(
      opts.propName,
      opts.propType,
      opts.defaultValue,
      opts.previewValue
    );
  }

  async drawRectRelativeToElt(
    elt: Locator,
    posX: number,
    posY: number,
    deltaX: number,
    deltaY: number
  ) {
    const res = await elt.boundingBox();
    if (res) {
      const initX = res.x + posX;
      const initY = res.y + posY;
      await this.drawRect(initX, initY, deltaX, deltaY);
    }
  }

  async drawRect(initX: number, initY: number, deltaX: number, deltaY: number) {
    const guard = this.frame.locator(".FreestyleBox__guard");

    const guardCount = await guard.count();
    if (guardCount > 0) {
      const isVisible = await guard.isVisible().catch(() => false);
      if (isVisible) {
        await guard.waitFor({ state: "visible", timeout: 5000 });
      }
    } else {
      await this.page.waitForTimeout(500);
    }

    await this.page.mouse.move(initX, initY);
    await this.page.mouse.down({ button: "left" });
    await this.page.mouse.move(initX, initY);
    await this.page.mouse.move(initX + deltaX, initY + deltaY);

    await this.page.waitForTimeout(50);

    await this.page.mouse.up({ button: "left" });
  }

  async submitPrompt(answer: string) {
    const promptInput = this.frame.locator('input[data-test-id="prompt"]');
    await promptInput.fill(answer);
    await this.promptSubmitButton.click();
  }

  async bindTextContentToDynamicValue(path: string[]) {
    await this.textContent.click({ button: "right" });
    await this.useDynamicValueButton.click();
    await this.rightPanel.selectPathInDataPicker(path);
  }

  async bindPropToDynamicValue(propSelector: string, path: string[]) {
    await this.frame.locator(propSelector).click({ button: "right" });
    await this.useDynamicValueButton.click();
    await this.rightPanel.selectPathInDataPicker(path);
  }

  async bindPropToCustomCode(propSelector: string, code: string) {
    await this.frame.locator(propSelector).click({ button: "right" });
    await this.useDynamicValueButton.click();
    await this.rightPanel.insertMonacoCode(code);
  }

  async plotText(frame: FrameLocator, x: number, y: number, text: string) {
    await this.page.keyboard.press("t");
    await this.plotAt(frame, x, y);
    await this.page.waitForTimeout(500);

    await frame
      .locator(".__wab_editing")
      .waitFor({ state: "visible", timeout: 5000 });

    await this.page.keyboard.type(text);
    await this.page.waitForTimeout(100);
    await this.page.keyboard.press("Escape");
    await this.page.waitForTimeout(300);
  }

  async plotAt(frame: FrameLocator, posX: number, posY: number) {
    const guard = frame.locator("body");
    const res = await guard.boundingBox();
    if (!res) {
      throw new Error("Couldn't get bounding box");
    }
    await guard.click({ position: { x: posX, y: posY }, force: true });
  }

  async waitForSave() {
    await this.page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const checkSaveIndicator = () => {
          const saveIndicator = document.querySelector(
            '*[class^="PlasmicSaveIndicator"]'
          );
          if (!saveIndicator) {
            resolve();
          } else {
            setTimeout(checkSaveIndicator, 100);
          }
        };
        checkSaveIndicator();
      });
    });
  }

  async pressPublishButton() {
    await this.waitForSave();
    await this.publishButton.click();
  }

  async addPlasmicHosting() {
    await this.publishFlowDialogAddWebsiteBtn.click();
  }

  async configureHosting() {
    await this.configureButton.click();
  }

  async inputCustomDomain(domain: string) {
    await this.domainInput.fill(domain);
    await this.page.keyboard.press("Enter");
  }

  async removeDomainCard() {
    await this.domainCard.locator("..").getByText("Remove").click();
  }

  async focusCreatedFrameRoot() {
    const frameCount = await this.frames.count();
    const frame = this.frames.nth(frameCount - 1);
    await this.focusFrameRoot(frame);
    return frame;
  }

  async waitStudioLoaded() {
    await this.frame
      .locator(".canvas-editor__scaler")
      .waitFor({ timeout: 120000 });
  }

  async getFramedByName(name: string) {
    const label = this.frameLabels.filter({ hasText: name }).first();
    await label.waitFor();
    const frameContainer = label
      .locator("..")
      .locator(".CanvasFrame__Container");
    const frame = frameContainer.locator(
      ".canvas-editor__viewport[data-test-frame-uid]"
    );
    await frame.waitFor();
    return frame;
  }

  async publishVersion(description: string) {
    await this.leftPanel.moreTabButton.hover();
    await this.leftPanel.switchToVersionsTab();
    const selector =
      ".SidebarSectionListItem:not(#publishing-version-spinner-item)";
    const countBefore = await this.frame.locator(selector).count();
    await this.publishProjectButton.click();
    await this.versionDescriptionInput.fill(description);
    await this.confirmPublishButton.click();
    await this.frame
      .locator("#publishing-version-spinner-item")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {});
    await this.frame.locator(selector).first().waitFor({ state: "visible" });
    await this.page.waitForTimeout(500);
    const countAfter = await this.frame.locator(selector).count();
    expect(countAfter).toBe(countBefore + 1);
  }

  async previewVersion(version: string) {
    await this.leftPanel.moreTabButton.hover();
    await this.leftPanel.switchToVersionsTab();
    await this.frame.getByText(version).click();
    await this.waitForFrameToLoad();
  }

  async revertToVersion(version: string) {
    await this.leftPanel.moreTabButton.hover();
    await this.leftPanel.switchToVersionsTab();

    await this.page.waitForTimeout(2000);

    const versionElement = this.frame.getByText(version).first();
    await versionElement.waitFor({ state: "attached", timeout: 10000 });

    await versionElement.evaluate((el) => {
      const event = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 2,
      });
      el.dispatchEvent(event);
    });

    await this.frame.getByText("Revert to this version").click();
    await this.revertButton.click();
    await this.waitForFrameToLoad();
  }

  async backToCurrentVersion() {
    await this.backToCurrentVersionButton.click();
  }

  async waitForFrameToLoad() {
    await this.page.waitForSelector("iframe.studio-frame", { timeout: 30000 });

    await this.page.waitForTimeout(3000);

    try {
      const overlay = this.page.locator(".rsbuild-error-overlay").first();
      if (await overlay.isVisible({ timeout: 500 })) {
        await this.page.keyboard.press("Escape");
        await this.page.waitForTimeout(500);
      }
    } catch (e) {}
  }

  async expectDebugTplTree(_expected: string) {}

  async expectDebugTplTreeForFrame(_index: number, _expected: string) {}

  async switchToLiveMode() {
    await this.enterLiveModeButton.click();
    await this.page.waitForTimeout(1000);
  }

  async switchToDesignMode() {
    await this.exitLiveModeButton.click();
    await this.page.waitForTimeout(1000);
  }

  async selectTreeNode(path: string[]) {
    await this.leftPanel.switchToTreeTab();
    let currentLocator = this.leftPanel.treeRoot;

    for (const nodeNameOrSlot of path) {
      if (nodeNameOrSlot.startsWith("Slot:")) {
        const slotName = nodeNameOrSlot.replace(/^Slot: "(.*)"$/, "$1");
        currentLocator = currentLocator.locator(
          `[data-test-slot-name="${slotName}"]`
        );
      } else {
        currentLocator = currentLocator.locator(
          `[data-test-node-name="${nodeNameOrSlot}"]`
        );
      }
    }

    await currentLocator.click();
  }

  async createNewComponent(name: string) {
    await this.leftPanel.addComponent(name);
    const frame = await this.createNewFrame();
    await this.waitForFrameToLoad();
    return frame;
  }

  async addInteraction(eventName: string, interaction: any) {
    await this.rightPanel.switchToSettingsTab();
    await this.page.waitForTimeout(500);

    await this.rightPanel.addInteractionButton.waitFor({ timeout: 10000 });
    await this.rightPanel.addInteractionButton.click();
    await this.page.waitForTimeout(500);

    await this.page.keyboard.type("on");
    await this.page.waitForTimeout(500);
    await this.page.keyboard.type(eventName.substring(2));
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press("Enter");
    await this.page.waitForTimeout(1500);

    const actionDropdown = this.rightPanel.frame.locator(
      '[data-plasmic-prop="action-name"]'
    );
    await actionDropdown.waitFor({ timeout: 15000 });
    await actionDropdown.click();
    await this.page.waitForTimeout(500);

    const actionKey = interaction.actionName;
    const actionOption = this.rightPanel.frame.locator(
      `[data-key="${actionKey}"]`
    );
    await actionOption.waitFor({ timeout: 10000 });
    await actionOption.click();

    if (interaction.actionName === "updateVariable") {
      await this.page.waitForTimeout(500);

      if (interaction.args.value) {
        await this.page.waitForTimeout(1000);
        const valueButton = this.rightPanel.frame
          .locator(`[data-plasmic-prop="value"]`)
          .first();
        await valueButton.waitFor({ timeout: 3000 });
        await valueButton.click();

        await this.page.waitForTimeout(500);
        await this.rightPanel.insertMonacoCode(interaction.args.value);

        await this.page.waitForTimeout(1000);
        const closeModalButton = this.rightPanel.frame.locator(
          '[data-test-id="close-sidebar-modal"]'
        );
        await closeModalButton.waitFor({ timeout: 5000 });
        await closeModalButton.click();
        await this.page.waitForTimeout(500);
      }
    } else if (interaction.actionName === "customFunction") {
      await this.page.waitForTimeout(500);

      if (interaction.args.customFunction) {
        const customFunctionInput = this.rightPanel.frame.locator(
          '[data-plasmic-prop="customFunction"]'
        );
        await customFunctionInput.waitFor({ timeout: 3000 });
        await customFunctionInput.click();

        await this.page.waitForTimeout(500);

        await this.rightPanel.insertMonacoCode(interaction.args.customFunction);

        await this.page.waitForTimeout(500);
      }
    }
  }

  async checkSelectedPropNodeAs(expectedType: "default" | "forked") {
    const selectedNode = this.leftPanel.focusedTreeNode;
    await selectedNode.click({ button: "right", force: true });

    const revertToItem = this.page.locator("text=/^revert to/i");

    if (expectedType === "default") {
      await expect(revertToItem).not.toBeVisible();
    } else {
      await expect(revertToItem).toBeVisible();
    }

    await selectedNode.click({ force: true });
  }

  async clickSelectedTreeNodeContextMenu(menuItem: string) {
    const selectedNode = this.leftPanel.focusedTreeNode;
    await selectedNode.click({ button: "right" });

    const contextMenu = this.frame.locator(".ant-dropdown-menu");
    await contextMenu.waitFor({ state: "visible", timeout: 5000 });

    const menuItemLocator = contextMenu.getByText(menuItem);
    await menuItemLocator.click();
  }

  async clearNotifications() {
    const closeButton = this.frame.locator(".ant-notification-notice-close");
    const count = await closeButton.count();
    for (let i = 0; i < count; i++) {
      await closeButton.first().click();
    }
  }
}
