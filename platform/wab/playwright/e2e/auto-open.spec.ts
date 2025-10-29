import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import {
  assertAutoOpened,
  assertHidden,
  checkCcAutoOpen,
  checkCcAutoOpenInteractiveMode,
  createTooltipComponent,
  getAutoOpenBanner,
  getSelectMeta,
  getTooltipMeta,
  insertModalComponent,
  setNotRendered,
  switchInteractiveMode,
  testAllImageVisbilities,
  testAllVisibilities,
} from "../utils/auto-open-utils";

const pageName = "Homepage";

test.describe("Auto Open", () => {
  let origDevFlags: any;
  let projectId: string;

  test.beforeEach(async ({ apiClient }) => {
    origDevFlags = await apiClient.getDevFlags();
    await apiClient.upsertDevFlags({
      ...origDevFlags,
      autoOpen: true,
      autoOpen2: true,
    });
  });

  test.afterEach(async ({ apiClient }) => {
    if (origDevFlags) {
      await apiClient.upsertDevFlags(origDevFlags);
    }
    if (projectId) {
      await apiClient.removeProjectAfterTest(
        projectId,
        "user2@example.com",
        "!53kr3tz!"
      );
    }
  });

  test.describe("Auto Open (Code components)", () => {
    test.beforeEach(async ({ apiClient, page, models }) => {
      projectId = await apiClient.setupProjectWithHostlessPackages({
        hostLessPackagesInfo: [
          {
            name: "react-aria",
            npmPkg: ["@plasmicpkgs/react-aria"],
          },
          {
            name: "antd5",
            npmPkg: ["@plasmicpkgs/antd5"],
          },
        ],
      });
      await page.goto(`/projects/${projectId}`);
      await models.studio.waitForFrameToLoad();
    });

    test("auto-opens hidden contents of code components", async ({
      models,
      page,
    }) => {
      await models.studio.createNewPageInOwnArena(pageName);
      await models.studio.waitForFrameToLoad();
      const pageFrame = models.studio.componentFrame;

      await models.studio.selectRootNode();
      await models.studio.leftPanel.insertNode("plasmic-react-aria-tooltip");
      await page.waitForTimeout(1000);

      await models.studio.leftPanel.switchToTreeTab();
      await page.waitForTimeout(500);

      await checkCcAutoOpen({
        models,
        frame: pageFrame,
        ...getTooltipMeta(),
      });

      await models.studio.selectRootNode();
      await models.studio.leftPanel.insertNode("plasmic-react-aria-select");
      await page.waitForTimeout(500);
      await checkCcAutoOpen({
        models,
        frame: pageFrame,
        ...getSelectMeta(),
      });

      await models.studio.turnOffDesignMode();
      const focusModeFrame = models.studio.componentFrame;

      await checkCcAutoOpen({
        models,
        frame: focusModeFrame,
        ...getTooltipMeta(),
      });

      await switchInteractiveMode(models);
      await checkCcAutoOpenInteractiveMode({
        models,
        frame: focusModeFrame,
        ...getTooltipMeta(),
      });

      await checkCcAutoOpenInteractiveMode({
        models,
        frame: focusModeFrame,
        ...getSelectMeta(),
      });

      await models.studio.withinLiveMode(async (liveFrame) => {
        await expect(
          liveFrame.getByText(getSelectMeta().visibleContent)
        ).toBeVisible();
        await expect(
          liveFrame.getByText(getTooltipMeta().visibleContent)
        ).toBeVisible();
        await expect(
          liveFrame.getByText(getSelectMeta().hiddenContent)
        ).not.toBeVisible();
        await expect(
          liveFrame.getByText(getTooltipMeta().hiddenContent)
        ).not.toBeVisible();
      });
    });

    test("works for Plasmic components with a code component root", async ({
      models,
    }) => {
      await models.studio.createNewPageInOwnArena(pageName);
      await models.studio.waitForFrameToLoad();

      await createTooltipComponent(models);

      const tooltipComponentMeta = {
        otherSlotName: `Slot: "Tooltip Contents"`,
        triggerSlotName: `Slot: "Tooltip Trigger"`,
        hiddenContent: "Hello from Tooltip!",
        ccDisplayName: "Tooltip",
        visibleContent: "Hover me",
      };

      await models.studio.switchArena(pageName);
      await models.studio.waitForFrameToLoad();
      const pageFrame = models.studio.componentFrame;
      await checkCcAutoOpen({
        models,
        frame: pageFrame,
        ...tooltipComponentMeta,
      });

      await models.studio.turnOffDesignMode();
      const focusModeFrame = models.studio.componentFrame;

      await checkCcAutoOpen({
        models,
        frame: focusModeFrame,
        ...tooltipComponentMeta,
      });

      await switchInteractiveMode(models);
      await checkCcAutoOpenInteractiveMode({
        models,
        frame: focusModeFrame,
        ...tooltipComponentMeta,
      });

      await models.studio.withinLiveMode(async (liveFrame) => {
        await expect(
          liveFrame.getByText(tooltipComponentMeta.visibleContent)
        ).toBeVisible();
        await expect(
          liveFrame.getByText(tooltipComponentMeta.hiddenContent)
        ).not.toBeVisible();
      });
    });

    test("should work when auto-openable components are inside another auto-openable component", async ({
      page,
      models,
    }) => {
      await models.studio.createNewPageInOwnArena(pageName);
      await models.studio.waitForFrameToLoad();
      const pageFrame = models.studio.componentFrame;

      const modalHiddenContent = "This is a Modal!";
      const tooltipHiddenContent = "Hello from Tooltip!";
      const tooltipVisibleContent = "Hover me!";
      const selectHiddenContent = "Section Header.";

      await models.studio.selectRootNode();
      await insertModalComponent(models, page);
      await page.waitForTimeout(500);
      await assertAutoOpened(pageFrame, modalHiddenContent);
      await expect(getAutoOpenBanner(models)).toBeVisible();

      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      await assertAutoOpened(pageFrame, modalHiddenContent);
      await expect(getAutoOpenBanner(models)).toBeVisible();

      await models.studio.leftPanel.insertNode("plasmic-react-aria-tooltip");
      await page.waitForTimeout(2000);

      await assertAutoOpened(
        pageFrame,
        tooltipHiddenContent,
        tooltipVisibleContent
      );
      await assertAutoOpened(pageFrame, modalHiddenContent);
      await expect(getAutoOpenBanner(models)).toBeVisible();

      await models.studio.leftPanel.switchToTreeTab();
      await models.studio.leftPanel.frame
        .getByText("Slot: Trigger")
        .first()
        .click();
      await assertHidden(
        pageFrame,
        tooltipHiddenContent,
        tooltipVisibleContent
      );
      await assertAutoOpened(pageFrame, modalHiddenContent);
      await expect(getAutoOpenBanner(models)).toBeVisible();

      await page.keyboard.press("Enter");
      await assertHidden(
        pageFrame,
        tooltipHiddenContent,
        tooltipVisibleContent
      );
      await assertAutoOpened(pageFrame, modalHiddenContent);
      await expect(getAutoOpenBanner(models)).toBeVisible();

      await models.studio.leftPanel.insertNode("plasmic-react-aria-select");
      await page.waitForTimeout(500);
      await assertAutoOpened(pageFrame, selectHiddenContent);
      await assertAutoOpened(pageFrame, modalHiddenContent);
      await assertHidden(
        pageFrame,
        tooltipHiddenContent,
        tooltipVisibleContent
      );
      await expect(getAutoOpenBanner(models)).toBeVisible();

      await models.studio.selectRootNode();
      await assertHidden(pageFrame, modalHiddenContent);
      await assertHidden(pageFrame, selectHiddenContent);
      await assertHidden(pageFrame, tooltipHiddenContent);
      await assertHidden(pageFrame, tooltipVisibleContent);
      await expect(getAutoOpenBanner(models)).not.toBeVisible();

      await models.studio.leftPanel.frame
        .getByText("Aria Select")
        .first()
        .click();
      await assertAutoOpened(pageFrame, selectHiddenContent);
      await assertAutoOpened(pageFrame, modalHiddenContent);
      await assertHidden(
        pageFrame,
        tooltipHiddenContent,
        tooltipVisibleContent
      );
      await expect(getAutoOpenBanner(models)).toBeVisible();

      await models.studio.leftPanel.frame
        .getByText("Aria Modal")
        .first()
        .click();
      await assertHidden(pageFrame, selectHiddenContent);
      await assertAutoOpened(pageFrame, modalHiddenContent);
      await assertHidden(
        pageFrame,
        tooltipHiddenContent,
        tooltipVisibleContent
      );
      await expect(getAutoOpenBanner(models)).toBeVisible();
    });

    test("works while navigating through tpl tree nested within the auto-opened content", async ({
      page,
      models,
    }) => {
      await models.studio.createNewPageInOwnArena(pageName);
      await models.studio.waitForFrameToLoad();
      const pageFrame = models.studio.componentFrame;
      const modalHiddenContent = "This is a Modal!";

      async function assertModalAutoOpened() {
        await assertAutoOpened(pageFrame, modalHiddenContent);
        await expect(getAutoOpenBanner(models)).toBeVisible();
      }

      async function assertModalHidden() {
        await assertHidden(pageFrame, modalHiddenContent);
        await expect(getAutoOpenBanner(models)).not.toBeVisible();
      }

      await models.studio.selectRootNode();
      await insertModalComponent(models, page);
      await assertModalAutoOpened();
      await page.keyboard.press("Enter");
      await assertModalAutoOpened();
      await page.keyboard.press("Enter");
      await assertModalAutoOpened();
      await page.keyboard.press("Enter");
      await assertModalAutoOpened();
      await page.keyboard.press("Tab");
      await assertModalAutoOpened();
      await page.keyboard.press("Tab");
      await assertModalAutoOpened();
      await page.keyboard.press("Shift+Enter");
      await assertModalAutoOpened();
      await page.keyboard.press("Shift+Enter");
      await assertModalAutoOpened();
      await page.keyboard.press("Shift+Enter");
      await assertModalAutoOpened();
      await page.keyboard.press("Shift+Enter");
      await assertModalHidden();
    });
  });

  test.describe("Auto open (Non-code components/elements)", () => {
    test.beforeEach(async ({ apiClient, page, models }) => {
      projectId = await apiClient.setupNewProject({
        name: "auto-open",
      });
      await page.goto(`/projects/${projectId}`);
      await models.studio.waitForFrameToLoad();
    });

    test.describe("auto-opens hidden elements", () => {
      test("works for Plasmic components", async ({ page, models }) => {
        const nodeName = "MyText";
        const text = "Starlight";

        await models.studio.leftPanel.addComponent("Text Component");

        await models.studio.waitForFrameToLoad();

        const frame = models.studio.getComponentFrameByIndex(0);
        await models.studio.focusFrameRoot(frame);
        await page.waitForTimeout(500);
        await models.studio.leftPanel.insertNode("Text");

        await page.waitForTimeout(500);
        await models.studio.renameTreeNode(nodeName);
        const selectedElt = await models.studio.getSelectedElt();
        await selectedElt.dblclick({ force: true });
        await page.waitForTimeout(100);
        await page.keyboard.type(text);
        await page.waitForTimeout(100);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);
        await models.studio.leftPanel.switchToTreeTab();
        await models.studio.focusFrameRoot(frame);
        await testAllVisibilities({ models, frame, text, nodeName });

        await models.studio.createNewPageInOwnArena(pageName);
        await models.studio.waitForFrameToLoad();
        const pageFrame = models.studio.getComponentFrameByIndex(1);
        await models.studio.leftPanel.insertNode("Text Component");
        await models.studio.renameTreeNode(nodeName);
        await testAllVisibilities({
          models,
          frame: pageFrame,
          text,
          nodeName,
          isPlasmicComponent: true,
        });
      });

      test("works for images", async ({ models }) => {
        await models.studio.createNewPageInOwnArena(pageName);
        await models.studio.waitForFrameToLoad();
        const pageFrame = models.studio.componentFrame;
        await models.studio.leftPanel.insertNode("Image");
        await models.studio.renameTreeNode("MyImage");
        await testAllImageVisbilities(models, pageFrame);
      });

      test("works for section", async ({ page, models }) => {
        const nodeName = "MySection";
        const text = "Starlight";
        await models.studio.createNewPageInOwnArena(pageName);
        await models.studio.waitForFrameToLoad();
        const pageFrame = models.studio.componentFrame;
        await models.studio.leftPanel.insertNode("Page section");
        await models.studio.renameTreeNode(nodeName);
        await models.studio.leftPanel.insertNode("Text");
        const selectedElt = await models.studio.getSelectedElt();
        await selectedElt.dblclick({ force: true });
        await page.waitForTimeout(100);
        await page.keyboard.type(text);
        await page.waitForTimeout(100);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);
        await testAllVisibilities({ models, frame: pageFrame, text, nodeName });
      });

      test("works for a child node whose parent is hidden", async ({
        page,
        models,
      }) => {
        await models.studio.createNewPageInOwnArena(pageName);
        await models.studio.waitForFrameToLoad();
        const pageFrame = models.studio.componentFrame;
        const parentNodeName = "MyParent";
        const nodeName = "MyText";
        const text = "Starlight";

        await models.studio.leftPanel.insertNode("Vertical stack");
        await models.studio.renameTreeNode(parentNodeName);
        await models.studio.leftPanel.insertNode("Text");
        await models.studio.renameTreeNode(nodeName);
        const selectedElt = await models.studio.getSelectedElt();
        await selectedElt.dblclick({ force: true });
        await page.waitForTimeout(100);
        await page.keyboard.type(text);
        await page.waitForTimeout(100);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);
        await testAllVisibilities({
          models,
          frame: pageFrame,
          text,
          nodeName,
          notRenderedParentNodeName: parentNodeName,
        });
      });

      test("works for a slot", async ({ page, models }) => {
        const nodeName = "MyText";
        const text = "Starlight";
        await models.studio.leftPanel.addComponent("Text Component");
        await models.studio.waitForFrameToLoad();
        await page.waitForTimeout(500);
        const frame = models.studio.componentFrame;
        await models.studio.leftPanel.insertNode("Text");
        await models.studio.renameTreeNode(nodeName);
        const selectedElt = await models.studio.getSelectedElt();
        await selectedElt.dblclick({ force: true });
        await page.waitForTimeout(100);
        await page.keyboard.type(text);
        await page.waitForTimeout(100);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);
        await models.studio.convertToSlot("children");
        await models.studio.selectRootNode();
        await testAllVisibilities({
          models,
          frame,
          text,
          nodeName: `Slot Target: "children"`,
          isSlot: true,
        });
      });

      test("works with undo functionality", async ({ page, models }) => {
        const nodeName = "MyText";
        const text = "Starlight";
        await models.studio.createNewPageInOwnArena(pageName);
        await models.studio.waitForFrameToLoad();
        const pageFrame = models.studio.componentFrame;

        await models.studio.selectRootNode();
        await models.studio.leftPanel.insertNode("Text");
        await models.studio.renameTreeNode(nodeName);
        await setNotRendered(models);
        await expect(getAutoOpenBanner(models)).not.toBeVisible();
        await models.studio.selectRootNode();
        await models.studio.leftPanel.switchToTreeTab();
        await models.studio.leftPanel.selectTreeNode([nodeName]);
        await expect(getAutoOpenBanner(models)).toBeVisible();
        await page.keyboard.press("Delete");
        await expect(pageFrame.getByText(text)).not.toBeVisible();
        await expect(getAutoOpenBanner(models)).not.toBeVisible();
        await page.keyboard.press("Control+z");
        await expect(getAutoOpenBanner(models)).toBeVisible();

        await models.studio.withinLiveMode(async (liveFrame) => {
          await expect(liveFrame.getByText(text)).not.toBeVisible();
        });
      });
    });
  });
});
