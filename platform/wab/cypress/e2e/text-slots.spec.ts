import { removeCurrentProject, setupNewProject } from "../support/util";

describe("text-slots", function () {
  beforeEach(() => {
    setupNewProject({
      name: "text-slots",
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("can create, override content, edit default content/styles", function () {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("Widget").then((framed) => {
        cy.focusFrameRoot(framed);
        cy.insertFromAddDrawer("Text");

        cy.createNewFrame().then((framed2) => {
          cy.justLog("Zoom out.");
          cy.justType("{shift}1");

          cy.justLog("Insert two Widgets.");
          cy.focusFrameRoot(framed2);
          cy.wait(500);
          cy.justType("{shift}A");
          cy.wait(500);
          cy.insertFromAddDrawer("Widget");
          cy.renameTreeNode("widget1");
          cy.wait(500);
          cy.insertFromAddDrawer("Widget");
          cy.renameTreeNode("widget2");

          cy.justLog("Back to frame 1, convert to slot.");
          cy.focusFrameRoot(framed);
          cy.justType("{enter}");
          cy.convertToSlot();

          cy.justLog("Back to frame 2.");
          cy.focusFrameRoot(framed2);

          cy.justLog("Edit 1st Widget's slot.");
          cy.justType("{enter}{enter}{enter}{enter}");
          framed2.enterIntoTplTextBlock("Hello");

          cy.justLog("Override the font-size.");
          cy.chooseFontSize("24px");

          cy.justLog("Back to frame 2 root.");
          cy.focusFrameRoot(framed2);

          cy.justLog("Edit 2nd Widget's slot.");
          framed2
            .rootElt()
            .contains("Enter some text")
            .dblclick({ force: true });
          framed2.enterIntoTplTextBlock("World");

          cy.justLog("Reset 2nd Widget's slot.");
          cy.selectTreeNode(["root", "widget2", `Slot: "children"`]);
          cy.clickSelectedTreeNodeContextMenu("Revert to");

          cy.justLog("Edit the default slot contents.");
          cy.focusFrameRoot(framed);
          cy.justType("{enter}{enter}{enter}");
          framed.enterIntoTplTextBlock("Goodbye");

          cy.justLog("Edit the default slot style.");
          cy.chooseFont("couri");

          cy.switchToTreeTab();

          cy.justLog("Back to frame 2 root");
          cy.focusFrameRoot(framed2);
          cy.withinLiveMode(() => {
            cy.justType("{rightarrow}");
            cy.contains("Hello")
              .should("have.css", "font-family", '"Courier New"')
              .should("have.css", "font-size", "24px");
            cy.contains("Goodbye")
              .should("have.css", "font-family", '"Courier New"')
              .should("have.css", "font-size", "16px");
          });

          const checkEndState = () => {
            cy.waitAllEval();

            framed.rebind();
            framed2.rebind();

            cy.justLog("Check that we're selecting the slot.");

            cy.focusFrameRoot(framed);
            cy.justType("{enter}");
            cy.getSelectionTag().should("contain", 'Slot Target: "children"');

            cy.justLog("Expect Hello Goodbye.");
            framed2.rootElt().contains("Hello");
            framed2.rootElt().contains("Goodbye");

            cy.justLog("Expect font-size override on the 1st Widget's slot.");
            framed2
              .rootElt()
              .contains("Hello")
              .should("have.css", "font-size", "24px");

            cy.justLog("Expect Courier New on both.");
            for (const msg of ["Hello", "Goodbye"]) {
              framed2
                .rootElt()
                .contains(msg)
                .should("have.css", "font-family", '"Courier New"');
            }

            cy.checkNoErrors();
          };

          checkEndState();
          cy.undoAndRedo();
          checkEndState();
        });
      });
    });
  });
});
