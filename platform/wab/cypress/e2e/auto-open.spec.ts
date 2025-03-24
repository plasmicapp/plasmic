import { DevFlagsType } from "../../src/wab/shared/devflags";
import { Framed, removeCurrentProject, setupNewProject } from "../support/util";

const pageName = "Homepage";

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
            checkCcAutoOpen({
              frame: focusModeFrame,
              ...getSelectMeta(),
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
            cy.selectRootNode();
            cy.insertFromAddDrawer("Tooltip");
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

    it("should work if select is inside an auto-openable component", () => {
      cy.withinStudioIframe(() => {
        cy.createNewPageInOwnArena(pageName).then((pageFrame) => {
          cy.justLog("Testing in design mode");
          cy.selectRootNode();
          // Modal has isOpen=true by default in the registration, so we don't need to worry about it being open/closed
          cy.insertFromAddDrawer("plasmic-react-aria-modal");
          pageFrame.base().contains("This is a Modal!").should("exist");
          cy.get(`[data-plasmic-prop="isOpen"]`).click(); // Modal has isOpen=true by default in the registration. We set isOpen to false so that it's an auto-opened node
          cy.selectRootNode();
          pageFrame.base().contains("This is a Modal!").should("not.exist");
          cy.selectTreeNode(["Aria Modal"]);
          pageFrame.base().contains("This is a Modal!").should("exist");
          cy.justType("{enter}{enter}"); // enter children slot
          cy.insertFromAddDrawer("plasmic-react-aria-tooltip");
          pageFrame.base().contains("Hover me!").should("exist");
          pageFrame.base().contains("Hello from Tooltip!").should("exist");
          cy.selectRootNode();
          pageFrame.base().contains("This is a Modal!").should("not.exist");
          cy.selectTreeNode(["Aria Tooltip"]);
          pageFrame.base().contains("This is a Modal!").should("exist"); // tooltip is inside children slot of modal, so modal is auto-opened here
          pageFrame.base().contains("Hello from Tooltip!").should("exist");

          cy.insertFromAddDrawer("plasmic-react-aria-select");
          pageFrame.base().contains("This is a Modal!").should("exist");
          pageFrame.base().contains("Section Header.").should("exist");
          cy.selectRootNode();
          pageFrame.base().contains("This is a Modal!").should("not.exist");
          cy.selectTreeNode(["Aria Select"]);
          pageFrame.base().contains("This is a Modal!").should("exist"); // select is inside children slot of modal, so modal is auto-opened here
          pageFrame.base().contains("Section Header").should("exist");
          cy.selectTreeNode(["Aria Modal"]);
          cy.selectTreeNode(["Aria Select"]);
          pageFrame.base().contains("Section Header").should("exist");
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
        cy.convertToSlot();
        cy.get(`[data-test-class="simple-text-box"]`).type(
          "{selectall}Tooltip Trigger"
        );
        cy.selectTreeNode(["Hello from Tooltip!"]);
        cy.convertToSlot();
        cy.get(`[data-test-class="simple-text-box"]`).type(
          "{selectall}Tooltip Contents"
        );
      });
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
        cy.convertToSlot();
        cy.get(`[data-test-class="simple-text-box"]`).type(
          "{selectall}Tooltip Parent Trigger"
        );
        cy.selectTreeNode(["Hello from Tooltip!"]);
        cy.convertToSlot();
        cy.get(`[data-test-class="simple-text-box"]`).type(
          "{selectall}Tooltip Parent Contents"
        );
      });
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
      cy.selectTreeNode([ccDisplayName]);
      frame.base().contains(visibleContent).should("exist");
      frame.base().contains(hiddenContent).should("exist");
      if (triggerSlotName) {
        cy.selectTreeNode([triggerSlotName]);
        frame.base().contains(hiddenContent).should("not.exist");
      }
      if (otherSlotName) {
        cy.selectTreeNode([otherSlotName]);
        frame.base().contains(hiddenContent).should("exist");
      }
      cy.turnOffAutoOpenMode();
      frame.base().contains(hiddenContent).should("not.exist");
      cy.selectRootNode(); // de-select the component
      cy.selectTreeNode([ccDisplayName]);
      frame.base().contains(hiddenContent).should("not.exist");
      if (triggerSlotName) {
        cy.selectTreeNode([triggerSlotName]);
        frame.base().contains(hiddenContent).should("not.exist");
      }
      if (otherSlotName) {
        cy.selectTreeNode([otherSlotName]);
        frame.base().contains(hiddenContent).should("not.exist");
      }
      cy.turnOnAutoOpenMode();
      frame.base().contains(hiddenContent).should("exist");
      cy.selectRootNode(); // de-select the component
      frame.base().contains(hiddenContent).should("not.exist");
      if (triggerSlotName) {
        cy.selectTreeNode([triggerSlotName]);
        frame.base().contains(hiddenContent).should("not.exist");
      }
      if (otherSlotName) {
        cy.selectTreeNode([otherSlotName]);
        frame.base().contains(hiddenContent).should("exist");
      }
      cy.selectRootNode(); // de-select the component
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
        const textContents = "Starlight";
        let selectedNodeName = "MyText";
        function checkTextAutoOpen(
          visibility: "notVisible" | "notRendered" | "customExpr",
          frame: Framed
        ) {
          const assertionPhrase =
            visibility === "notVisible" ? "be.visible" : "exist";
          frame.base().contains(textContents).should(assertionPhrase); // auto-open does not need to wait for next selection, if the item is already selected
          cy.selectRootNode(); // de-select
          frame.base().contains(textContents).should(`not.${assertionPhrase}`);
          cy.selectTreeNode([selectedNodeName]);
          frame.base().contains(textContents).should(assertionPhrase);
          cy.turnOffAutoOpenMode();
          frame.base().contains(textContents).should(`not.${assertionPhrase}`);
          cy.turnOnAutoOpenMode();
          cy.selectRootNode(); // de-select
          cy.selectTreeNode([selectedNodeName]);
          frame.base().contains(textContents).should(assertionPhrase);
        }

        cy.createNewComponent("Text Component").then((compFrame) => {
          cy.selectRootNode();
          cy.insertFromAddDrawer("Text");
          cy.renameTreeNode(selectedNodeName);
          cy.getSelectedElt().dblclick({ force: true });
          compFrame.enterIntoTplTextBlock(textContents);
          compFrame.base().contains(textContents).should("exist");
          cy.setDisplayNone();
          checkTextAutoOpen("notVisible", compFrame);
          cy.setNotRendered();
          checkTextAutoOpen("notRendered", compFrame);
          cy.setDynamicVisibility("false");
          checkTextAutoOpen("customExpr", compFrame);
          cy.withinLiveMode(() => {
            // The hidden content stays hidden in live preview
            cy.contains(textContents).should("not.exist");
          });
          cy.setVisible();
        });

        cy.createNewPageInOwnArena(pageName).then((pageFrame) => {
          cy.selectRootNode();
          cy.insertFromAddDrawer("Text Component");
          selectedNodeName = "MyTextComp";
          cy.renameTreeNode(selectedNodeName);
          // TODO: This fails because the auto open feature currently does not work for components having display: none
          // cy.setDisplayNone();
          // checkTextAutoOpen("notVisible", pageFrame);
          cy.setNotRendered();
          checkTextAutoOpen("notRendered", pageFrame);
          cy.setDynamicVisibility("false");
          checkTextAutoOpen("customExpr", pageFrame);
          cy.withinLiveMode(() => {
            // The hidden content stays hidden in live preview
            cy.contains(textContents).should("not.exist");
          });
        });
      });
    });
  });
});
