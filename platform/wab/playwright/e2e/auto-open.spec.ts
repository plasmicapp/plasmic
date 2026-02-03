import { expect } from "@playwright/test";
import { test } from "../fixtures/test";
import {
  assertAutoOpened,
  assertHidden,
  checkCcAutoOpen,
  checkCcAutoOpenInteractiveMode,
  createTooltipComponent,
  getAutoOpenBanner,
  insertModalComponent,
  setNotRendered,
  switchInteractiveMode,
  testAllImageVisbilities,
  testAllVisibilities,
} from "../utils/auto-open-utils";
import { goToProject, waitForFrameToLoad } from "../utils/studio-utils";

const pageName = "Homepage";

test.describe("Auto Open", () => {
  let projectId: string;

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!"
    );
  });

  test.describe("Auto Open (Code components)", () => {
    test.beforeEach(async ({ apiClient, page }) => {
      projectId = await apiClient.setupProjectWithHostlessPackages({
        hostLessPackagesInfo: [
          {
            name: "react-aria",
            npmPkg: ["@plasmicpkgs/react-aria"],
          },
          // Using antd5 to verify auto-open works with a global context (PLA-11833)
          {
            name: "antd5",
            npmPkg: ["@plasmicpkgs/antd5"],
          },
        ],
      });
      await goToProject(page, `/projects/${projectId}`);
    });

    test("auto-opens hidden contents of code components", async ({
      models,
      page,
    }) => {
      const tooltipMeta = {
        otherSlotName: "Slot: Tooltip Content",
        triggerSlotName: "Slot: Trigger",
        hiddenContent: "Hello from Tooltip!",
        ccDisplayName: "Aria Tooltip",
        visibleContent: "Hover me",
      };
      const selectMeta = {
        otherSlotName: "children",
        hiddenContent: "Section Header.",
        ccDisplayName: "Aria Select",
        visibleContent: "Select an item",
      };

      await models.studio.createNewPageInOwnArena(pageName);
      await waitForFrameToLoad(page);
      const pageFrame = models.studio.componentFrame;

      await models.studio.selectRootNode();
      await models.studio.leftPanel.insertNode("plasmic-react-aria-tooltip");
      await page.waitForTimeout(1000);

      await models.studio.leftPanel.switchToTreeTab();
      await page.waitForTimeout(500);

      await checkCcAutoOpen({
        models,
        frame: pageFrame,
        ...tooltipMeta,
      });

      await models.studio.selectRootNode();
      await models.studio.leftPanel.insertNode("plasmic-react-aria-select");
      await page.waitForTimeout(500);
      await checkCcAutoOpen({
        models,
        frame: pageFrame,
        ...selectMeta,
      });

      await models.studio.turnOffDesignMode();
      const focusModeFrame = models.studio.componentFrame;

      await checkCcAutoOpen({
        models,
        frame: focusModeFrame,
        ...tooltipMeta,
      });

      await switchInteractiveMode(models);
      await checkCcAutoOpenInteractiveMode({
        models,
        frame: focusModeFrame,
        ...tooltipMeta,
      });

      await checkCcAutoOpenInteractiveMode({
        models,
        frame: focusModeFrame,
        ...selectMeta,
      });

      await models.studio.withinLiveMode(async (liveFrame) => {
        await expect(
          liveFrame.getByText(selectMeta.visibleContent)
        ).toBeVisible();
        await expect(
          liveFrame.getByText(tooltipMeta.visibleContent)
        ).toBeVisible();
        await expect(
          liveFrame.getByText(selectMeta.hiddenContent)
        ).not.toBeVisible();
        await expect(
          liveFrame.getByText(tooltipMeta.hiddenContent)
        ).not.toBeVisible();
      });
    });

    test("works for Plasmic components with a code component root", async ({
      page,
      models,
    }) => {
      const tooltipComponentMeta = {
        otherSlotName: `Slot: "Tooltip Contents"`,
        triggerSlotName: `Slot: "Tooltip Trigger"`,
        hiddenContent: "Hello from Tooltip!",
        ccDisplayName: "Tooltip",
        visibleContent: "Hover me",
      };
      await models.studio.createNewPageInOwnArena(pageName);
      await waitForFrameToLoad(page);

      await createTooltipComponent(page, models);

      await models.studio.switchArena(pageName);
      await waitForFrameToLoad(page);
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
      await waitForFrameToLoad(page);
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
      await waitForFrameToLoad(page);
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
    test.beforeEach(async ({ apiClient, page }) => {
      projectId = await apiClient.setupNewProject({
        name: "auto-open",
      });
      await goToProject(page, `/projects/${projectId}`);
    });

    test.describe("auto-opens hidden elements", () => {
      test("works for Plasmic components", async ({ page, models }) => {
        const nodeName = "MyText";
        const text = "Starlight";

        await models.studio.leftPanel.addComponent("Text Component");

        await waitForFrameToLoad(page);

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
        await waitForFrameToLoad(page);
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

      test("works for images", async ({ page, models }) => {
        await models.studio.createNewPageInOwnArena(pageName);
        await waitForFrameToLoad(page);
        const pageFrame = models.studio.componentFrame;
        await models.studio.leftPanel.insertNode("Image");
        await models.studio.renameTreeNode("MyImage");
        await testAllImageVisbilities(models, pageFrame);
      });

      test("works for section", async ({ page, models }) => {
        const nodeName = "MySection";
        const text = "Starlight";
        await models.studio.createNewPageInOwnArena(pageName);
        await waitForFrameToLoad(page);
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
        await waitForFrameToLoad(page);
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
        await waitForFrameToLoad(page);
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
        await waitForFrameToLoad(page);
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

/* This is an old Cypress auto-open test for auto-open multi-level nesting. It was not converted to Playwright
 * since it was skipped. If (when?) multi-level auto-open works, this can be used as a reference.

    // TODO: Auto-open currently only works for one level of nesting, so skipping this test
    xit("works for multiple levels of nesting (Plasmic components with a Plasmic component root with a code component root", function () {
      cy.withinStudioIframe(() => {
        cy.createNewPageInOwnArena(pageName).then(() => {
          function getTooltipMeta() {
            return {
              otherSlotName: `Slot: "Tooltip Parent Contents"`,
              triggerSlotName: `Slot: "Tooltip Parent Trigger"`,
              hiddenContent: "Hello from Tooltip!",
              ccDisplayName: "Tooltip Parent",
              visibleContent: "Hover me",
            };
          }
          cy.justLog("Testing in design mode");
          createTooltipComponent();
          cy.switchArena(pageName).then(() => {
            createTooltipParentComponent();
          });
          cy.switchArena(pageName).then((pageFrame) => {
            cy.selectTreeNode(["Tooltip Parent"]);
            checkCcAutoOpen({
              frame: pageFrame,
              ...getTooltipMeta(),
            });
          });

          cy.turnOffDesignMode();
          cy.focusBaseFrame().then((focusModeFrame) => {
            cy.justLog("Testing in focus mode");
            checkCcAutoOpen({
              frame: focusModeFrame,
              ...getTooltipMeta(),
            });
            cy.switchInteractiveMode();
            cy.justLog("Testing in interactive mode");
            checkCcAutoOpenInteractiveMode({
              frame: focusModeFrame,
              ...getTooltipMeta(),
            });
          });
        });
      });
    });
*/
