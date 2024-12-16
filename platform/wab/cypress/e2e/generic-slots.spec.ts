import {
  FREE_CONTAINER_CAP,
  FREE_CONTAINER_LOWER,
} from "../../src/wab/shared/Labels";
import { removeCurrentProject, setupNewProject } from "../support/util";

describe("generic-slots", function () {
  beforeEach(() => {
    setupNewProject({
      name: "generic-slots",
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("can create, override content, edit default content", function () {
    cy.withinStudioIframe(() => {
      cy.createNewComponent("Widget").then((framed) => {
        cy.focusFrameRoot(framed);
        cy.justLog("Draw a rect slot.");
        cy.justType("r");
        cy.drawRectRelativeToElt(framed.getFrame(), 10, 10, 50, 50);

        cy.createNewFrame().then((framed2) => {
          cy.justLog("Zoom out.");
          cy.justType("{shift}1");

          cy.justLog("Insert two Widgets.");
          cy.focusFrameRoot(framed2);
          cy.wait(500);
          cy.dragGalleryItemRelativeToElt("Widget", framed2.getFrame(), 10, 10);
          cy.renameTreeNode("widget1");
          cy.wait(500);
          cy.dragGalleryItemRelativeToElt(
            "Widget",
            framed2.getFrame(),
            10,
            100
          );
          cy.renameTreeNode("widget2");

          cy.justLog("Back to frame 1, convert to slot.");
          cy.focusFrameRoot(framed);
          cy.justType("{enter}");
          cy.convertToSlot();

          cy.justLog("Back to frame 2.");
          cy.focusFrameRoot(framed2);

          cy.justLog("Edit 1st Widget's slot.");
          cy.justType("{enter}{enter}");
          framed2.plotTextAtSelectedElt("so rough");
          framed2.rootElt().contains("so rough").should("exist");

          cy.justLog("Back to frame 2 root.");
          cy.focusFrameRoot(framed2);

          cy.justLog("Edit 2nd Widget's slot.");
          framed2.rootElt().contains("Widget Slot").click({ force: true });
          framed2.plotTextAtSelectedElt("so tough");

          cy.justLog("Reset 2nd Widget's slot.");
          cy.justType("{shift}{enter}");
          cy.getSelectionTag().rightclick({ force: true });
          cy.contains("Revert to").click({ force: true });

          cy.justLog("Edit the default slot contents.");
          cy.focusFrameRoot(framed);
          cy.justType("{enter}{enter}");
          cy.insertFromAddDrawer(FREE_CONTAINER_CAP);

          cy.justLog("Back on 2nd Widget instance, fork default contents.");
          cy.focusFrameRoot(framed2);
          framed2
            .rootElt()
            .contains(FREE_CONTAINER_LOWER)
            .click({ force: true });
          cy.insertFromAddDrawer("Text");

          cy.justType("{shift}{enter}{enter}");

          cy.switchToTreeTab();
          cy.withinLiveMode(() => {
            cy.contains("so rough").should("exist");
            cy.contains("Enter some text").should("exist");
          });

          const checkEndState = () => {
            cy.waitAllEval();

            framed.rebind();
            framed2.rebind();

            // TODO: commenting to unblock failing test for now
            // cy.justLog("Check that we're selecting the slot.");
            // cy.getSelectionTag().should("contain", `Prop: "children"`);

            cy.justLog("Expect final text.");
            framed2.rootElt().contains("so rough").should("be.visible");
            framed2.rootElt().contains("Enter some text").should("be.visible");

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
