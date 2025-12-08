import { expect, FrameLocator, Page } from "@playwright/test";
import { PageModels } from "../fixtures/test";
import { modifierKey } from "./key-utils";
import { waitForFrameToLoad } from "./studio-utils";

export function getTooltipMeta() {
  return {
    otherSlotName: "Slot: Tooltip Content",
    triggerSlotName: "Slot: Trigger",
    hiddenContent: "Hello from Tooltip!",
    ccDisplayName: "Aria Tooltip",
    visibleContent: "Hover me",
  };
}

export function getSelectMeta() {
  return {
    otherSlotName: "children",
    hiddenContent: "Section Header.",
    ccDisplayName: "Aria Select",
    visibleContent: "Select an item",
  };
}

export function getAutoOpenBanner(models: PageModels) {
  return models.studio.frame.locator(".banner-bottom");
}

export async function turnOffAutoOpenMode(models: PageModels) {
  const viewMenu = models.studio.frame.locator("#view-menu");
  await viewMenu.click();
  await models.studio.page.waitForTimeout(500);
  await models.studio.frame.getByText("Turn off auto-open mode").click();
  await models.studio.page.waitForTimeout(500);
}

export async function turnOnAutoOpenMode(models: PageModels) {
  const banner = getAutoOpenBanner(models);
  if (!(await banner.isVisible())) {
    const viewMenu = models.studio.frame.locator("#view-menu");
    await viewMenu.click();
    await models.studio.page.waitForTimeout(500);
    await models.studio.frame.getByText("Turn on auto-open mode").click();
    await models.studio.page.waitForTimeout(500);
  }
}

export async function hideAutoOpen(models: PageModels) {
  const banner = getAutoOpenBanner(models);
  await banner.getByText("Hide").click();
  await models.studio.page.waitForTimeout(500);
}

export async function switchInteractiveMode(models: PageModels) {
  const interactiveSwitch = models.studio.frame.locator(
    '[data-test-id="interactive-switch"]'
  );

  try {
    await interactiveSwitch.waitFor({ state: "attached", timeout: 10000 });
  } catch (e) {
    throw new Error(
      "Interactive switch not found - focus mode might not be fully loaded"
    );
  }

  try {
    await interactiveSwitch.click({ force: true });
    await models.studio.page.waitForTimeout(500);
  } catch (e: unknown) {
    const label = models.studio.frame.locator(
      'label:has([data-test-id="interactive-switch"])'
    );
    await label.click();
    await models.studio.page.waitForTimeout(500);
  }
}

export async function setNotRendered(models: PageModels) {
  await models.studio.rightPanel.switchToDesignTab();
  await models.studio.rightPanel.frame
    .locator('[data-test-id="visibility-choices"]')
    .click({ button: "right" });
  await models.studio.rightPanel.frame
    .locator('[data-plasmic-prop="display-not-rendered"]')
    .first()
    .click();
}

export async function setDisplayNone(models: PageModels) {
  await models.studio.rightPanel.switchToDesignTab();
  await models.studio.rightPanel.frame
    .locator('[data-plasmic-prop="display-not-visible"]')
    .click();
}

export async function setVisible(models: PageModels) {
  await models.studio.rightPanel.switchToDesignTab();
  await models.studio.rightPanel.frame
    .locator('[data-plasmic-prop="display-visible"]')
    .click();
}

export async function setDynamicVisibility(
  models: PageModels,
  expression: string
) {
  await models.studio.rightPanel.switchToDesignTab();
  await models.studio.frame
    .locator('[data-test-id="visibility-choices"]')
    .click({ button: "right" });
  await models.studio.useDynamicValueButton.click();
  await models.studio.rightPanel.frame
    .getByText("Switch to Code")
    .waitFor({ state: "visible" });
  await models.studio.rightPanel.frame.getByText("Switch to Code").click();
  await models.studio.rightPanel.frame.locator(".monaco-editor").waitFor();
  await models.studio.page.waitForTimeout(100);

  await models.studio.page.keyboard.press(`${modifierKey}+a`);
  await models.studio.page.waitForTimeout(100);
  await models.studio.page.keyboard.press("Delete");
  await models.studio.page.waitForTimeout(100);
  await models.studio.page.keyboard.type(expression);

  await models.studio.rightPanel.saveDataPicker();
}

export async function toggleVisiblity(models: PageModels, nodeName: string) {
  await models.studio.leftPanel.frame
    .locator(".tpltree__label", { hasText: nodeName })
    .hover();
  await models.studio.leftPanel.frame
    .locator(".tpltree__label", { hasText: nodeName })
    .locator(".tpltree__label__visibility")
    .click();
}

export async function assertHidden(
  frame: FrameLocator,
  hiddenContent: string,
  visibleContent?: string
) {
  if (visibleContent) {
    await expect(frame.getByText(visibleContent)).toBeVisible();
  }
  await expect(frame.getByText(hiddenContent)).not.toBeVisible();
}

export async function assertAutoOpened(
  frame: FrameLocator,
  hiddenContent: string,
  visibleContent?: string
) {
  if (visibleContent) {
    await expect(frame.getByText(visibleContent)).toBeVisible({
      timeout: 10000,
    });
  }
  await expect(frame.getByText(hiddenContent)).toBeVisible({ timeout: 10000 });
}

export async function checkCcAutoOpen({
  models,
  frame,
  triggerSlotName,
  otherSlotName,
  ccDisplayName,
  hiddenContent,
  visibleContent,
}: {
  models: PageModels;
  frame: FrameLocator;
  triggerSlotName?: string;
  otherSlotName?: string;
  ccDisplayName: string;
  hiddenContent: string;
  visibleContent: string;
}) {
  async function _assertHidden() {
    await assertHidden(frame, hiddenContent, visibleContent);
    await expect(getAutoOpenBanner(models)).not.toBeVisible();
  }

  async function _assertAutoOpened() {
    await assertAutoOpened(frame, hiddenContent, visibleContent);
    await expect(getAutoOpenBanner(models)).toBeVisible();
  }

  await models.studio.page.waitForTimeout(500);

  await models.studio.leftPanel.selectTreeNode([ccDisplayName]);
  await _assertAutoOpened();

  if (triggerSlotName) {
    await models.studio.leftPanel.selectTreeNode([triggerSlotName]);
    await _assertHidden();
  }

  if (otherSlotName) {
    await models.studio.leftPanel.selectTreeNode([otherSlotName]);
    await _assertAutoOpened();
  }

  await turnOffAutoOpenMode(models);
  await _assertHidden();
  await models.studio.selectRootNode();
  await _assertHidden();
  await models.studio.leftPanel.selectTreeNode([ccDisplayName]);
  await _assertHidden();

  if (triggerSlotName) {
    await models.studio.leftPanel.selectTreeNode([triggerSlotName]);
    await _assertHidden();
  }

  if (otherSlotName) {
    await models.studio.leftPanel.selectTreeNode([otherSlotName]);
    await _assertHidden();
  }

  await turnOnAutoOpenMode(models);
  await _assertAutoOpened();
  await hideAutoOpen(models);
  await _assertHidden();
  await models.studio.selectRootNode();
  await _assertHidden();

  if (triggerSlotName) {
    await models.studio.leftPanel.selectTreeNode([triggerSlotName]);
    await _assertHidden();
  }

  if (otherSlotName) {
    await models.studio.leftPanel.selectTreeNode([otherSlotName]);
    await _assertAutoOpened();
    await hideAutoOpen(models);
    await _assertHidden();
  }

  await models.studio.selectRootNode();
  await _assertHidden();
}

export async function createTooltipComponent(page: Page, models: PageModels) {
  await models.studio.leftPanel.insertNode("plasmic-react-aria-tooltip");
  await waitForFrameToLoad(page);

  await models.studio.extractComponentNamed("Tooltip");

  await models.studio.frame.getByText("[Open component]").click();
  await waitForFrameToLoad(page);

  await models.studio.leftPanel.switchToTreeTab();
  await page.waitForTimeout(1000);

  const expandAllButton = models.studio.leftPanel.frame.locator(
    'button[class*="expandAllButton"]'
  );
  if ((await expandAllButton.count()) > 0) {
    await expandAllButton.click();
    await page.waitForTimeout(500);
  }

  await models.studio.leftPanel.selectTreeNode(["Slot: Trigger", "Hover me!"]);
  await models.studio.convertToSlot("Tooltip Trigger");
  await page.waitForTimeout(500);

  await models.studio.leftPanel.selectTreeNode([
    "Slot: Tooltip Content",
    "Hello from Tooltip!",
  ]);
  await models.studio.convertToSlot("Tooltip Contents");
  await page.waitForTimeout(500);
}

export async function assertModalAutoOpened(
  frame: FrameLocator,
  modalContent: string
) {
  await expect(
    frame.locator(`:has-text("${modalContent}")`).first()
  ).toBeVisible();
}

export async function assertModalHidden(
  frame: FrameLocator,
  modalContent: string
) {
  await expect(
    frame.locator(`:has-text("${modalContent}")`).first()
  ).not.toBeVisible();
}

export async function insertModalComponent(models: PageModels, page: Page) {
  await models.studio.leftPanel.insertNode("plasmic-react-aria-modal");
  await waitForFrameToLoad(page);

  const autoOpenBanner = getAutoOpenBanner(models);
  await expect(autoOpenBanner).not.toBeVisible();

  const isOpenLabel = models.studio.frame
    .locator('[data-test-id="prop-editor-row-isOpen"] label')
    .first();
  await isOpenLabel.click({ button: "right" });

  await models.studio.frame.getByText("Use dynamic value").click();
  await models.studio.frame.getByText("Switch to Code").click();

  const monacoEditor = models.studio.frame.locator(".monaco-editor textarea");

  await models.studio.frame.locator(".monaco-editor").click();
  await page.waitForTimeout(100);
  await page.keyboard.press(`${modifierKey}+a`);
  await page.waitForTimeout(100);
  await page.keyboard.press("Delete");
  await page.waitForTimeout(100);
  await monacoEditor.fill("false");
  await page.waitForTimeout(100);

  await models.studio.rightPanel.saveDataPicker();
  // await models.studio.page.keyboard.press("Tab");
  await expect(autoOpenBanner).toBeVisible({ timeout: 10000 });
}

export async function testElementAutoOpen(
  models: PageModels,
  frame: FrameLocator,
  nodeName: string,
  hiddenContent: string,
  isAutoOpenable: boolean = true
) {
  async function checkHidden() {
    await expect(frame.getByText(hiddenContent)).not.toBeVisible();
    await expect(getAutoOpenBanner(models)).not.toBeVisible();
  }

  async function checkAutoOpened() {
    await expect(frame.getByText(hiddenContent)).toBeVisible();
    await expect(getAutoOpenBanner(models)).toBeVisible();
  }

  if (!isAutoOpenable) {
    await checkHidden();
    await models.studio.selectRootNode();
    await checkHidden();
    await models.studio.leftPanel.selectTreeNode([nodeName]);
    await checkHidden();
    return;
  }

  await models.studio.selectRootNode();
  await checkHidden();

  await models.studio.leftPanel.selectTreeNode([nodeName]);
  await checkAutoOpened();

  await turnOffAutoOpenMode(models);
  await checkHidden();

  await turnOnAutoOpenMode(models);
  await checkAutoOpened();

  await models.studio.selectRootNode();
  await checkHidden();

  await models.studio.leftPanel.selectTreeNode([nodeName]);
  await checkAutoOpened();
}

type VisibilityType = "notVisible" | "notRendered" | "customExpr";

export async function checkTextAutoOpen(
  models: PageModels,
  frame: FrameLocator,
  isAutoOpenable: boolean,
  visibility: VisibilityType,
  textContents: string,
  nodeName: string,
  hasNotRenderedParent?: boolean
) {
  const refocusFrame = async () => {
    await models.studio.focusFrameRoot(frame);
  };

  async function assertTextHidden() {
    await expect(frame.getByText(textContents)).not.toBeVisible();
    await expect(getAutoOpenBanner(models)).not.toBeVisible();
  }

  async function assertTextAutoOpened() {
    await expect(frame.getByText(textContents)).toBeVisible();
    await expect(getAutoOpenBanner(models)).toBeVisible();
  }

  if (hasNotRenderedParent) {
    await models.studio.leftPanel.selectTreeNode([nodeName]);
    await assertTextAutoOpened();
  } else {
    await assertTextHidden();
  }

  if (!isAutoOpenable) {
    await assertTextHidden();
    await refocusFrame();
    await models.studio.leftPanel.frame
      .locator(".tpltree__label")
      .first()
      .click();
    await refocusFrame();
    await models.studio.page.keyboard.press("Escape");
    await assertTextHidden();
    await refocusFrame();
    await models.studio.leftPanel.selectTreeNode([nodeName]);
    await assertTextHidden();
    return;
  }

  await refocusFrame();
  await models.studio.leftPanel.frame
    .locator(".tpltree__label")
    .first()
    .click();
  await refocusFrame();
  await models.studio.page.keyboard.press("Escape");
  await assertTextHidden();
  await refocusFrame();
  await models.studio.leftPanel.selectTreeNode([nodeName]);
  await setDynamicVisibility(models, "false");
  await models.studio.leftPanel.frame
    .locator(".tpltree__label")
    .first()
    .click();
  await models.studio.leftPanel.selectTreeNode([nodeName]);
  await assertTextAutoOpened();
  await turnOffAutoOpenMode(models);
  await refocusFrame();
  await assertTextHidden();
  await turnOnAutoOpenMode(models);
  await refocusFrame();
  await models.studio.leftPanel.selectTreeNode([nodeName]);
  await assertTextAutoOpened();
  await refocusFrame();
  await models.studio.leftPanel.frame
    .locator(".tpltree__label")
    .first()
    .click();
  await refocusFrame();
  await models.studio.page.keyboard.press("Escape");
  await assertTextHidden();
  await refocusFrame();
  await models.studio.leftPanel.selectTreeNode([nodeName]);
  await assertTextAutoOpened();
}

export async function checkImageAutoOpen(
  models: PageModels,
  frame: FrameLocator,
  visibility: VisibilityType,
  nodeName: string
) {
  const refocusFrame = async () => {
    await models.studio.focusFrameRoot(frame);
  };

  async function assertImageHidden() {
    await expect(frame.locator("img").first()).not.toBeVisible();
    await expect(getAutoOpenBanner(models)).not.toBeVisible();
  }

  async function assertImageAutoOpened() {
    await expect(frame.locator("img").first()).toBeVisible();
    await expect(getAutoOpenBanner(models)).toBeVisible();
  }

  await refocusFrame();
  await models.studio.leftPanel.frame
    .locator(".tpltree__label")
    .first()
    .click();
  await refocusFrame();
  await models.studio.page.keyboard.press("Escape");
  await assertImageHidden();

  await refocusFrame();
  await models.studio.leftPanel.selectTreeNode([nodeName]);
  await assertImageAutoOpened();

  await turnOffAutoOpenMode(models);
  await refocusFrame();
  await assertImageHidden();

  await turnOnAutoOpenMode(models);
  await refocusFrame();
  await models.studio.leftPanel.selectTreeNode([nodeName]);
  await assertImageAutoOpened();

  await refocusFrame();
  await models.studio.leftPanel.frame
    .locator(".tpltree__label")
    .first()
    .click();
  await refocusFrame();
  await models.studio.page.keyboard.press("Escape");
  await assertImageHidden();

  await refocusFrame();
  await models.studio.leftPanel.selectTreeNode([nodeName]);
  await assertImageAutoOpened();
}

export async function testAllVisibilities({
  models,
  frame,
  notRenderedParentNodeName,
  text,
  nodeName,
  isSlot = false,
  isPlasmicComponent = false,
}: {
  models: PageModels;
  frame: FrameLocator;
  text: string;
  nodeName: string;
  notRenderedParentNodeName?: string;
  isSlot?: boolean;
  isPlasmicComponent?: boolean;
}) {
  const hasNotRenderedParent = !!notRenderedParentNodeName;

  const refocusFrame = async () => {
    await models.studio.focusFrameRoot(frame);
  };

  await expect(frame.getByText(text)).toBeVisible();

  if (hasNotRenderedParent) {
    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.leftPanel.selectTreeNode([notRenderedParentNodeName]);
    await setNotRendered(models);
    await models.studio.selectRootNode();
  }

  const isLeftPanelVisible = await models.studio.leftPanel.frame
    .locator(".tpltree__root")
    .isVisible();

  if (!isLeftPanelVisible) {
    await models.studio.leftPanel.switchToTreeTab();
  }
  await models.studio.leftPanel.selectTreeNode([nodeName]);

  if (!isSlot) {
    await setDisplayNone(models);
    await refocusFrame();

    if (isPlasmicComponent) {
      await checkTextAutoOpen(
        models,
        frame,
        false,
        hasNotRenderedParent ? "notRendered" : "notVisible",
        text,
        nodeName,
        hasNotRenderedParent
      );
    } else {
      await checkTextAutoOpen(
        models,
        frame,
        true,
        hasNotRenderedParent ? "notRendered" : "notVisible",
        text,
        nodeName,
        hasNotRenderedParent
      );
    }
    await models.studio.leftPanel.selectTreeNode([nodeName]);
  }

  await setVisible(models);
  await refocusFrame();
  await models.studio.leftPanel.selectTreeNode([nodeName]);
  await setNotRendered(models);
  await refocusFrame();
  await checkTextAutoOpen(
    models,
    frame,
    true,
    "notRendered",
    text,
    nodeName,
    hasNotRenderedParent
  );

  await setVisible(models);
  await refocusFrame();
  await models.studio.leftPanel.selectTreeNode([nodeName]);
  await setDynamicVisibility(models, "false");
  await refocusFrame();
  await checkTextAutoOpen(
    models,
    frame,
    true,
    "customExpr",
    text,
    nodeName,
    hasNotRenderedParent
  );

  if (!hasNotRenderedParent) {
    await models.studio.leftPanel.selectTreeNode([nodeName]);
    await setVisible(models);
    await refocusFrame();
    await expect(frame.getByText(text)).toBeVisible();
  }

  if (notRenderedParentNodeName) {
    await models.studio.leftPanel.selectTreeNode([notRenderedParentNodeName]);
  } else {
    await models.studio.leftPanel.frame
      .locator(".tpltree__label")
      .first()
      .click();
  }

  if (!isPlasmicComponent) {
    await toggleVisiblity(models, nodeName);
    await checkTextAutoOpen(
      models,
      frame,
      true,
      hasNotRenderedParent || isSlot ? "notRendered" : "notVisible",
      text,
      nodeName,
      hasNotRenderedParent
    );

    await toggleVisiblity(models, nodeName);
    if (hasNotRenderedParent) {
      await expect(frame.getByText(text)).toBeAttached();
    } else {
      await expect(frame.getByText(text)).toBeVisible();
    }
  }

  if (notRenderedParentNodeName) {
    await models.studio.leftPanel.selectTreeNode([notRenderedParentNodeName]);
    await setVisible(models);
  }
}

export async function testAllImageVisbilities(
  models: PageModels,
  frame: FrameLocator
) {
  await expect(frame.locator("img").first()).toBeAttached();

  await models.studio.leftPanel.switchToTreeTab();
  await models.studio.leftPanel.selectTreeNode(["MyImage"]);
  await models.studio.page.waitForTimeout(500);

  await setDisplayNone(models);
  await checkImageAutoOpen(models, frame, "notVisible", "MyImage");

  await models.studio.leftPanel.selectTreeNode(["MyImage"]);
  await setVisible(models);
  await setNotRendered(models);
  await checkImageAutoOpen(models, frame, "notRendered", "MyImage");

  await models.studio.leftPanel.selectTreeNode(["MyImage"]);
  await setVisible(models);
  await setDynamicVisibility(models, "false");
  await checkImageAutoOpen(models, frame, "customExpr", "MyImage");

  await models.studio.leftPanel.selectTreeNode(["MyImage"]);
  await setVisible(models);
  await expect(frame.locator("img").first()).toBeAttached();
}

export async function checkCcAutoOpenInteractiveMode({
  models,
  frame,
  triggerSlotName,
  otherSlotName,
  ccDisplayName,
  hiddenContent,
  visibleContent,
}: {
  models: PageModels;
  frame: FrameLocator;
  triggerSlotName?: string;
  otherSlotName?: string;
  ccDisplayName: string;
  visibleContent: string;
  hiddenContent: string;
}) {
  async function selectTreeNodeByText(nodeName: string) {
    await models.studio.leftPanel.switchToTreeTab();
    await models.studio.page.waitForTimeout(500);

    let searchName = nodeName;
    if (nodeName === "Aria Tooltip") {
      searchName = "Aria TooltipAria Tooltip";
    } else if (nodeName === "Aria Select") {
      searchName = "Aria SelectAria Select";
    }

    const treeLabels = models.studio.leftPanel.frame.locator(".tpltree__label");
    const count = await treeLabels.count();

    for (let i = 0; i < count; i++) {
      const label = treeLabels.nth(i);
      const text = await label.textContent();
      if (text && (text.trim() === searchName || text.trim() === nodeName)) {
        await label.evaluate((el: HTMLElement) => el.click());
        await models.studio.page.waitForTimeout(500);
        return;
      }
    }
  }

  await expect(frame.getByText(visibleContent)).toBeVisible();
  await expect(frame.getByText(hiddenContent)).not.toBeVisible();
  await models.studio.selectRootNode();
  await selectTreeNodeByText(ccDisplayName);
  await expect(frame.getByText(hiddenContent)).not.toBeVisible();

  if (triggerSlotName) {
    await expect(frame.getByText(hiddenContent)).not.toBeVisible();
    await selectTreeNodeByText(triggerSlotName);
  }

  if (otherSlotName) {
    await expect(frame.getByText(hiddenContent)).not.toBeVisible();
    await selectTreeNodeByText(otherSlotName);
  }
}
