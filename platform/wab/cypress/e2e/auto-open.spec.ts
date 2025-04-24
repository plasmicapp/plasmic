import { DevFlagsType } from "../../src/wab/shared/devflags";
import { Framed, removeCurrentProject, setupNewProject } from "../support/util";

const pageName = "Homepage";
type VisibilityType = "notVisible" | "notRendered" | "customExpr";
describe("Auto Open", () => {
  let origDevFlags: DevFlagsType;
  beforeEach(() => {
    cy.getDevFlags().then((devFlags) => {
      origDevFlags = devFlags;
      cy.upsertDevFlags({
        ...origDevFlags,
        autoOpen: true,
        autoOpen2: true,
      });
    });
  });

  afterEach(() => {
    if (origDevFlags) {
      cy.upsertDevFlags(origDevFlags);
    }
  });

  describe("Auto Open (Code components)", function () {
    beforeEach(() => {
      cy.setupProjectWithHostlessPackages({
        hostLessPackagesInfo: [
          {
            name: "react-aria",
            npmPkg: ["@plasmicpkgs/react-aria"],
          },
          // Using antd5 here to test that auto-open works when there is a global context (PLA-11833)
          {
            name: "antd5",
            npmPkg: ["@plasmicpkgs/antd5"],
          },
        ],
      });
    });

    afterEach(() => {
      removeCurrentProject();
    });

    it("auto-opens hidden contents of code components", function () {
      cy.withinStudioIframe(() => {
        cy.createNewPageInOwnArena(pageName).then((pageFrame) => {
          function getTooltipMeta() {
            return {
              otherSlotName: "Slot: Tooltip Content",
              triggerSlotName: "Slot: Trigger",
              hiddenContent: "Hello from Tooltip!",
              ccDisplayName: "Aria Tooltip",
              visibleContent: "Hover me",
            };
          }
          function getSelectMeta() {
            return {
              otherSlotName: "children",
              hiddenContent: "Section Header.",
              ccDisplayName: "Aria Select",
              visibleContent: "Select an item",
            };
          }
          cy.justLog("Testing in design mode");
          cy.selectRootNode();
          cy.insertFromAddDrawer("plasmic-react-aria-tooltip");
          checkCcAutoOpen({
            frame: pageFrame,
            ...getTooltipMeta(),
          });
          cy.insertFromAddDrawer("plasmic-react-aria-select");
          checkCcAutoOpen({
            frame: pageFrame,
            ...getSelectMeta(),
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
            checkCcAutoOpenInteractiveMode({
              frame: focusModeFrame,
              ...getSelectMeta(),
            });
          });

          cy.withinLiveMode(() => {
            cy.contains(getSelectMeta().visibleContent).should("exist");
            cy.contains(getTooltipMeta().visibleContent).should("exist");
            // The hidden content stays hidden in live preview
            cy.contains(getSelectMeta().hiddenContent).should("not.exist");
            cy.contains(getTooltipMeta().hiddenContent).should("not.exist");
          });
        });
      });
    });
    it("works for Plasmic components with a code component root", function () {
      cy.withinStudioIframe(() => {
        cy.createNewPageInOwnArena(pageName).then(() => {
          function getTooltipMeta() {
            return {
              otherSlotName: `Slot: "Tooltip Contents"`,
              triggerSlotName: `Slot: "Tooltip Trigger"`,
              hiddenContent: "Hello from Tooltip!",
              ccDisplayName: "Tooltip",
              visibleContent: "Hover me",
            };
          }

          createTooltipComponent();

          cy.justLog("Testing in design mode");
          cy.switchArena(pageName).then((pageFrame) => {
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
          cy.withinLiveMode(() => {
            cy.contains(getTooltipMeta().visibleContent).should("exist");
            // The hidden content stays hidden in live preview
            cy.contains(getTooltipMeta().hiddenContent).should("not.exist");
          });
        });
      });
    });
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

    it("should work when auto-openable components are inside another auto-openable component", () => {
      cy.withinStudioIframe(() => {
        cy.createNewPageInOwnArena(pageName).then((pageFrame) => {
          cy.justLog("Testing in design mode");
          const modalHiddenContent = "This is a Modal!";
          const tooltipHiddenContent = "Hello from Tooltip!";
          const tooltipVisibleContent = "Hover me!";
          const selectHiddenContent = "Section Header.";
          cy.selectRootNode();
          insertModalComponent();
          assertAutoOpened(pageFrame, modalHiddenContent);
          cy.autoOpenBanner().should("exist");
          cy.justType("{enter}{enter}"); // enter children slot
          assertAutoOpened(pageFrame, modalHiddenContent);
          cy.autoOpenBanner().should("exist");

          cy.insertFromAddDrawer("plasmic-react-aria-tooltip");
          assertAutoOpened(
            pageFrame,
            tooltipHiddenContent,
            tooltipVisibleContent
          );
          assertAutoOpened(pageFrame, modalHiddenContent);
          cy.autoOpenBanner().should("exist");

          cy.selectTreeNode(["Slot: Trigger"]); // select trigger slot
          assertHidden(pageFrame, tooltipHiddenContent, tooltipVisibleContent);
          assertAutoOpened(pageFrame, modalHiddenContent);
          cy.autoOpenBanner().should("exist");

          cy.justType("{enter}"); // enter trigger slot
          assertHidden(pageFrame, tooltipHiddenContent, tooltipVisibleContent);
          assertAutoOpened(pageFrame, modalHiddenContent);
          cy.autoOpenBanner().should("exist");

          cy.insertFromAddDrawer("plasmic-react-aria-select");
          // TODO: PLA-11850 Select does not auto-open on first render
          // assertAutoOpened(pageFrame, selectHiddenContent);
          assertAutoOpened(pageFrame, modalHiddenContent);
          assertHidden(pageFrame, tooltipHiddenContent, tooltipVisibleContent);
          cy.autoOpenBanner().should("exist");

          cy.wait(100);
          cy.selectRootNode();
          assertHidden(pageFrame, modalHiddenContent);
          assertHidden(pageFrame, selectHiddenContent);
          assertHidden(pageFrame, tooltipHiddenContent);
          assertHidden(pageFrame, tooltipVisibleContent); // the tooltip visible content is also hidden, because tooltip is inside modal, which is hidden
          cy.autoOpenBanner().should("not.exist");

          cy.selectTreeNode(["Aria Select"]);
          // TODO: PLA-11850 Select does not auto-open on first render
          // assertAutoOpened(pageFrame, selectHiddenContent);
          assertAutoOpened(pageFrame, modalHiddenContent);
          // TODO: PLA-12032 resurphased after revert of PLA-11850, because the select's auto-open was triggering tooltip to hide again.
          // assertHidden(pageFrame, tooltipHiddenContent, tooltipVisibleContent);
          cy.autoOpenBanner().should("exist");

          cy.selectTreeNode(["Aria Modal"]);
          assertHidden(pageFrame, selectHiddenContent);
          assertAutoOpened(pageFrame, modalHiddenContent);
          // TODO: resurphased after revert of PLA-11850, because the select's auto-open was triggering tooltip to hide again.
          // assertHidden(pageFrame, tooltipHiddenContent, tooltipVisibleContent);
          cy.autoOpenBanner().should("exist");
        });
      });
    });

    it("works while navigating through tpl tree nested within the auto-opened content", function () {
      cy.withinStudioIframe(() => {
        cy.createNewPageInOwnArena(pageName).then((pageFrame) => {
          const modalHiddenContent = "This is a Modal!";
          function assertModalAutoOpened() {
            assertAutoOpened(pageFrame, modalHiddenContent);
            cy.autoOpenBanner().should("exist");
          }
          function assertModalHidden() {
            assertHidden(pageFrame, modalHiddenContent);
            cy.autoOpenBanner().should("not.exist");
          }
          cy.justLog("Testing in design mode");
          cy.selectRootNode();
          insertModalComponent();
          assertModalAutoOpened();
          cy.justType("{enter}"); // select children slot
          assertModalAutoOpened();
          cy.justType("{enter}"); // select the vertical stack directly inside children slot
          assertModalAutoOpened();
          cy.justType("{enter}"); // select the children of vertical stack
          assertModalAutoOpened();
          cy.realPress("Tab"); // select next sibling
          assertModalAutoOpened();
          cy.realPress("Tab"); // select next sibling
          assertModalAutoOpened();
          cy.justType("{shift}{enter}"); // go back to vertical stack
          assertModalAutoOpened();
          cy.justType("{shift}{enter}"); // go back to children slot
          assertModalAutoOpened();
          cy.justType("{shift}{enter}"); // go back to modal
          assertModalAutoOpened();
          cy.justType("{shift}{enter}"); // go back to page
          assertModalHidden();
        });
      });
    });

    // TODO: Skipping, because not sure how to simulate multi-selection in the tpl tree. Tried the shiftKey: true option in .click() inside selectTreeNode(), but it didn't work
    xit("works with multi-selection", () => {
      cy.withinStudioIframe(() => {
        cy.createNewPageInOwnArena(pageName).then((pageFrame) => {
          const modalHiddenContent = "This is a Modal!";
          function assertModalAutoOpened() {
            assertAutoOpened(pageFrame, modalHiddenContent);
            cy.autoOpenBanner().should("exist");
          }
          function assertModalHidden() {
            assertHidden(pageFrame, modalHiddenContent);
            cy.autoOpenBanner().should("not.exist");
          }
          cy.justLog("Testing in design mode");
          cy.selectRootNode();
          insertModalComponent();
          assertModalAutoOpened();
          cy.insertFromAddDrawer("Text");
          cy.renameTreeNode("Text1");
          cy.insertFromAddDrawer("Text");
          cy.renameTreeNode("Text2");
          assertModalHidden();
          cy.selectTreeNode(["Aria Modal"]);
          assertModalHidden(); // modal is not the first one selected, so it's not auto-opened
          cy.selectTreeNode(["Text2"]); // deselects Text2
          assertModalAutoOpened(); // modal is the only one selected, so it's auto-opened
          cy.selectTreeNode(["Text2"]); // adds Text2 back
          assertModalAutoOpened(); // modal is still the FIRST one selected, so it's auto-opened
          cy.selectTreeNode(["Aria Modal"]); // deselects modal
          assertModalHidden(); // modal is no longer selected, so it's hidden
        });
      });
    });

    function createTooltipComponent() {
      cy.insertFromAddDrawer("plasmic-react-aria-tooltip");
      cy.extractComponentNamed("Tooltip");
      cy.contains("[Open component]").click();
      cy.waitForNewFrame(() => {
        cy.switchToTreeTab();
        cy.wait(1000);
        cy.get(`button[class*="expandAllButton"]`).click();
        cy.selectTreeNode(["Hover me!"]);
        cy.convertToSlot("Tooltip Trigger");
        cy.get(`[data-test-class="simple-text-box"]`);
        cy.selectTreeNode(["Hello from Tooltip!"]);
        cy.convertToSlot("Tooltip Contents");
      });
    }

    function insertModalComponent() {
      cy.insertFromAddDrawer("plasmic-react-aria-modal");
      cy.autoOpenBanner().should("not.exist"); // because the isOpen is defaulted to true in the registration
      cy.get(`[data-test-id="prop-editor-row-isOpen"] label`)
        .eq(0)
        .rightclick();
      cy.contains("Use dynamic value").click();
      cy.contains("Switch to Code").click();
      cy.resetMonacoEditorToCode(`false`);
      cy.autoOpenBanner().should("exist");
    }

    function createTooltipParentComponent() {
      cy.insertFromAddDrawer("Tooltip");
      cy.extractComponentNamed("Tooltip Parent");
      cy.contains("[Open component]").click();
      cy.waitForNewFrame(() => {
        cy.switchToTreeTab();
        cy.wait(1000);
        cy.get(`button[class*="expandAllButton"]`).click();
        cy.selectTreeNode(["Hover me!"]);
        cy.convertToSlot("Tooltip Parent Trigger");
        cy.selectTreeNode(["Hello from Tooltip!"]);
        cy.convertToSlot("Tooltip Parent Contents");
      });
    }

    function assertHidden(
      frame: Framed,
      hiddenContent: string,
      visibleContent?: string
    ) {
      if (visibleContent) {
        frame.base().contains(visibleContent).should("exist");
      }
      frame.base().contains(hiddenContent).should("not.exist");
    }
    function assertAutoOpened(
      frame: Framed,
      hiddenContent: string,
      visibleContent?: string
    ) {
      if (visibleContent) {
        frame.base().contains(visibleContent).should("exist");
      }
      frame.base().contains(hiddenContent).should("exist");
    }

    function checkCcAutoOpen({
      frame,
      triggerSlotName,
      otherSlotName,
      ccDisplayName,
      hiddenContent,
      visibleContent,
    }: {
      frame: Framed;
      triggerSlotName?: string;
      otherSlotName?: string;
      ccDisplayName: string;
      hiddenContent: string;
      visibleContent: string;
    }) {
      function _assertHidden() {
        assertHidden(frame, hiddenContent, visibleContent);
        cy.autoOpenBanner().should("not.exist");
      }
      function _assertAutoOpened() {
        assertAutoOpened(frame, hiddenContent, visibleContent);
        cy.autoOpenBanner().should("exist");
      }
      // TODO: PLA-11850 Select does not auto-open on first render, so we de-select it first by selecting the root node
      cy.selectRootNode();
      cy.selectTreeNode([ccDisplayName]);
      _assertAutoOpened();
      if (triggerSlotName) {
        cy.selectTreeNode([triggerSlotName]);
        _assertHidden();
      }
      if (otherSlotName) {
        cy.selectTreeNode([otherSlotName]);
        _assertAutoOpened();
      }
      cy.turnOffAutoOpenMode();
      _assertHidden();
      cy.selectRootNode(); // de-select the component
      _assertHidden();
      cy.selectTreeNode([ccDisplayName]);
      _assertHidden();

      if (triggerSlotName) {
        cy.selectTreeNode([triggerSlotName]);
        _assertHidden();
      }
      if (otherSlotName) {
        cy.selectTreeNode([otherSlotName]);
        _assertHidden();
      }
      cy.log("Testing Hide button in auto-open banner");
      cy.turnOnAutoOpenMode();
      _assertAutoOpened();
      cy.hideAutoOpen();
      _assertHidden();
      cy.selectRootNode(); // de-select the component
      _assertHidden();
      if (triggerSlotName) {
        cy.selectTreeNode([triggerSlotName]);
        _assertHidden();
      }
      if (otherSlotName) {
        cy.selectTreeNode([otherSlotName]);
        _assertAutoOpened();
        cy.hideAutoOpen();
        _assertHidden();
      }
      cy.selectRootNode(); // de-select the component
      _assertHidden();
    }
    function checkCcAutoOpenInteractiveMode({
      frame,
      triggerSlotName,
      otherSlotName,
      ccDisplayName,
      hiddenContent,
      visibleContent,
    }: {
      frame: Framed;
      triggerSlotName?: string;
      otherSlotName?: string;
      ccDisplayName: string;
      visibleContent: string;
      hiddenContent: string;
    }) {
      frame.rootElt().contains(visibleContent).should("exist");
      frame.base().contains(hiddenContent).should("not.exist");
      cy.selectRootNode(); // de-select the component
      cy.selectTreeNode([ccDisplayName]);
      frame.base().contains(hiddenContent).should("not.exist");
      if (triggerSlotName) {
        frame.base().contains(hiddenContent).should("not.exist");
        cy.selectTreeNode([triggerSlotName]);
      }
      if (otherSlotName) {
        frame.base().contains(hiddenContent).should("not.exist");
        cy.selectTreeNode([otherSlotName]);
      }
    }
  });

  describe("Auto open (Non-code components/elements)", () => {
    beforeEach(() => {
      setupNewProject({
        name: "auto-open",
      });
    });

    afterEach(() => {
      removeCurrentProject();
    });
    it("auto-opens hidden elements", function () {
      cy.withinStudioIframe(() => {
        const textNodeName = "MyText";
        const verticalStackNodeName = "MyVerticalStack";
        let childTextNodeName = "MyChildText";
        const textContents = "Starlight";
        const childTextContents = "Galaxy";

        let checkParams = {
          textNodeName,
          textContents,
        };

        function checkTextAutoOpen(
          visibility: VisibilityType,
          frame: Framed,
          hasNotRenderedParent?: boolean
        ) {
          const assertionPhrase =
            visibility === "notVisible" ? "be.visible" : "exist";
          function assertHidden() {
            frame
              .base()
              .contains(checkParams.textContents)
              .should(`not.${assertionPhrase}`);
            cy.autoOpenBanner().should("not.exist");
          }

          function assertAutoOpened() {
            frame
              .base()
              .contains(checkParams.textContents)
              .should(assertionPhrase);
            cy.autoOpenBanner().should("exist");
          }
          if (hasNotRenderedParent) {
            assertAutoOpened(); // auto-open does not need to wait for next selection, if the parent is already auto-opened
          } else {
            assertHidden(); // Auto-open hidden element on next selection only (PLA-11958)
          }
          cy.wait(400);
          cy.selectRootNode(); // de-select
          assertHidden();
          cy.selectTreeNode([checkParams.textNodeName]);
          assertAutoOpened();
          cy.turnOffAutoOpenMode();
          assertHidden();
          cy.turnOnAutoOpenMode();
          assertAutoOpened();
          cy.selectRootNode(); // de-select
          assertHidden();
          cy.selectTreeNode([checkParams.textNodeName]);
          assertAutoOpened();
        }

        function testAllVisibilities({
          frame,
          notRenderedParentNodeName,
          isSlot = false,
          isPlasmicComponent = false,
        }: {
          frame: Framed;
          notRenderedParentNodeName?: string;
          isSlot?: boolean;
          isPlasmicComponent?: boolean;
        }) {
          const hasNotRenderedParent = !!notRenderedParentNodeName;
          frame.base().contains(checkParams.textContents).should("exist");

          if (hasNotRenderedParent) {
            cy.selectTreeNode([notRenderedParentNodeName]);
            cy.setNotRendered();
            cy.selectRootNode();
          }

          cy.selectTreeNode([checkParams.textNodeName]);

          // Slots do not have display: none visibility option!
          if (!isSlot && !isPlasmicComponent) {
            // TODO: We do not test DisplayNone visibility for Plasmic component because the auto open feature currently does not work for Plasmic components having display: none
            cy.log("Test DisplayNone visibility");
            cy.setDisplayNone();
            checkTextAutoOpen(
              hasNotRenderedParent ? "notRendered" : "notVisible",
              frame,
              hasNotRenderedParent
            );
          }
          cy.log("Test NotRendered visibility");
          cy.setVisible();
          cy.setNotRendered();
          checkTextAutoOpen("notRendered", frame, hasNotRenderedParent);
          cy.log("Test Dynamic visibility");
          cy.setVisible();
          cy.setDynamicVisibility("false");
          checkTextAutoOpen("customExpr", frame, hasNotRenderedParent);
          cy.log("Test Visible visibility");
          cy.setVisible();
          frame.base().contains(checkParams.textContents).should("exist");
          if (notRenderedParentNodeName) {
            cy.selectTreeNode([notRenderedParentNodeName]);
          } else {
            cy.selectRootNode();
          }
          // TODO: We do not test DisplayNone visibility for Plasmic component because the auto open feature currently does not work for Plasmic components having display: none
          if (!isPlasmicComponent) {
            cy.log("Test visibility toggle");
            cy.toggleVisiblity(checkParams.textNodeName);
            checkTextAutoOpen(
              hasNotRenderedParent || isSlot ? "notRendered" : "notVisible",
              frame,
              hasNotRenderedParent
            );

            cy.toggleVisiblity(checkParams.textNodeName);
            frame.base().contains(checkParams.textContents).should("exist");
          }
          if (notRenderedParentNodeName) {
            cy.selectTreeNode([notRenderedParentNodeName]);
            cy.setVisible();
          }
        }

        cy.createNewComponent("Text Component").then((frame) => {
          cy.selectRootNode();
          cy.insertFromAddDrawer("Text");
          cy.renameTreeNode(textNodeName);
          cy.getSelectedElt().dblclick({ force: true });
          frame.enterIntoTplTextBlock(textContents);

          testAllVisibilities({ frame });

          cy.insertFromAddDrawer("Vertical stack");
          cy.renameTreeNode(verticalStackNodeName);
          cy.insertFromAddDrawer("Text");
          cy.renameTreeNode(childTextNodeName);
          cy.getSelectedElt().dblclick({ force: true });
          frame.enterIntoTplTextBlock(childTextContents);
          checkParams = {
            textNodeName: childTextNodeName,
            textContents: childTextContents,
          };
          testAllVisibilities({
            frame,
            notRenderedParentNodeName: verticalStackNodeName,
          });
          cy.convertToSlot("children");
          childTextNodeName = `Slot Target: "children"`;
          checkParams = {
            ...checkParams,
            textNodeName: childTextNodeName,
          };
          testAllVisibilities({
            frame,
            notRenderedParentNodeName: verticalStackNodeName,
            isSlot: true,
          });
        });

        cy.createNewPageInOwnArena(pageName).then((frame) => {
          cy.selectRootNode();
          cy.insertFromAddDrawer("Text Component");
          const compNodeName = "MyTextComp";
          cy.renameTreeNode(compNodeName);
          checkParams = {
            ...checkParams,
            textNodeName: compNodeName,
          };
          testAllVisibilities({ frame, isPlasmicComponent: true });
          cy.selectTreeNode([compNodeName]);
          cy.justLog("Test undo functionality");
          cy.setNotRendered();
          cy.autoOpenBanner().should("not.exist"); // Auto-open hidden element on next selection only
          cy.selectRootNode();
          cy.selectTreeNode([compNodeName]);
          cy.autoOpenBanner().should("exist");
          cy.justType("{del}"); // delete the text
          frame.base().contains(textContents).should(`not.exist`);
          cy.autoOpenBanner().should("not.exist");
          cy.undoTimes(1);
          cy.autoOpenBanner().should("exist");

          cy.withinLiveMode(() => {
            // The hidden content stays hidden in live preview
            cy.contains(textContents).should("not.exist");
          });
        });
      });
    });
  });
});
