import {
  HORIZ_CONTAINER_CAP,
  VERT_CONTAINER_CAP,
} from "../../src/wab/shared/Labels";
import {
  createNewComponent,
  deselect,
  Framed,
  removeCurrentProject,
  setupNewProject,
} from "../support/util";

describe("virtual-slots", () => {
  beforeEach(() => {
    setupNewProject({
      name: "virtual-slots",
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("can work with virtual slots properly", () => {
    cy.withinStudioIframe(() => {
      cy.justLog("collapse arenas panel for more space for the tree panel");
      createNewComponent("MyButton").then((framed) => {
        cy.justLog("focus on root");
        cy.justType("{enter}");
        cy.insertFromAddDrawer("Text");
        cy.justType("{enter}");
        framed.enterIntoTplTextBlock("Button");
        cy.convertToSlot();
      });
      deselect();
      createNewComponent("MyPanel").then((framed) => {
        cy.justType("{enter}");
        cy.insertFromAddDrawer(HORIZ_CONTAINER_CAP);
        cy.renameTreeNode("hstack");

        cy.insertFromAddDrawer("MyButton");
        cy.renameTreeNode("button1");

        cy.justLog("select the prop; should be default");
        cy.selectTreeNode(["root", "hstack", "button1", `Slot: "children"`]);
        cy.checkSelectedPropNodeAs("default");

        cy.justLog("Insert another button");
        cy.selectTreeNode(["root", "hstack"]);
        cy.insertFromAddDrawer("MyButton");
        cy.renameTreeNode("button2");

        cy.justLog("Set the text of the second MyButton");
        cy.selectTreeNode([
          "root",
          "hstack",
          "button2",
          `Slot: "children"`,
          "Button",
        ]);
        cy.justType("{enter}");
        framed.enterIntoTplTextBlock("Weird");
        framed.rootElt().contains("Weird").should("exist");

        cy.justLog("Select the prop; should be forked");
        cy.selectTreeNode(["root", "hstack", "button2", `Slot: "children"`]);
        cy.checkSelectedPropNodeAs("forked");

        cy.justLog("Revert content");
        cy.clickSelectedTreeNodeContextMenu("Revert to");
        framed.rootElt().contains("Weird").should("not.exist");
        cy.checkSelectedPropNodeAs("default");

        cy.justLog("Customize it again");
        cy.selectTreeNode([
          "root",
          "hstack",
          "button2",
          `Slot: "children"`,
          "Button",
        ]);
        cy.justType("{enter}");
        framed.enterIntoTplTextBlock("Weird");
        framed.rootElt().contains("Weird").should("exist");

        cy.justLog("Select the horizontal container, and convert to a slot");
        cy.selectTreeNode(["root", "hstack"]);
        cy.clickSelectedTreeNodeContextMenu("Convert to a slot");

        cy.justLog(
          "Check that the button slot default-ness are still holding up"
        );
        cy.selectTreeNode([
          "root",
          "hstack",
          "Slot Target",
          "button1",
          `Slot: "children"`,
        ]);
        cy.checkSelectedPropNodeAs("default");

        cy.justLog("Navigate to the second prop");
        cy.selectTreeNode([
          "root",
          "hstack",
          "Slot Target",
          "button2",
          `Slot: "children"`,
        ]);
        cy.checkSelectedPropNodeAs("forked");

        cy.justLog("Go back up to the root");
        cy.selectTreeNode(["root"]);

        cy.justLog("Add another button outside of the slot");
        cy.insertFromAddDrawer(VERT_CONTAINER_CAP);
        cy.renameTreeNode("vstack");
        cy.insertFromAddDrawer("MyButton");
        cy.renameTreeNode("button3");

        cy.justLog("Drag button 3 into the slot as default content");
        cy.dragTreeNode(
          ["root", "vstack", "button3"],
          ["root", "hstack", "Slot Target"]
        );

        cy.justLog("Check default-ness of each button slot still holding up");
        cy.selectTreeNode([
          "root",
          "hstack",
          "Slot Target",
          "button1",
          `Slot: "children"`,
        ]);
        cy.checkSelectedPropNodeAs("default");

        cy.selectTreeNode([
          "root",
          "hstack",
          "Slot Target",
          "button2",
          `Slot: "children"`,
        ]);
        cy.checkSelectedPropNodeAs("forked");

        cy.selectTreeNode([
          "root",
          "hstack",
          "Slot Target",
          "button3",
          `Slot: "children"`,
        ]);
        cy.checkSelectedPropNodeAs("default");

        cy.justLog("Drag it back out; Button slot should still be default");
        cy.dragTreeNode(
          ["root", "hstack", "Slot Target", "button3"],
          ["root", "vstack"]
        );
        cy.selectTreeNode(["root", "vstack", "button3", "Slot"]);
        cy.checkSelectedPropNodeAs("default");
      });
      cy.deselect();

      cy.justLog("Create a new frame...");
      cy.createNewFrame().then((framed: Framed) => {
        cy.justLog("Drag in a panel");
        cy.dragGalleryItemRelativeToElt("MyPanel", framed.getFrame(), 10, 10);
        cy.renameTreeNode("panel1");

        cy.justLog("Panel's prop should be default");
        cy.selectTreeNode(["panel1", "Slot"]);
        cy.checkSelectedPropNodeAs("default");

        cy.justLog("button1 prop should be default");
        cy.selectTreeNode(["panel1", "Slot", "button1", "Slot"]);
        cy.checkSelectedPropNodeAs("default");

        cy.justLog("button2 prop should be forked");
        cy.selectTreeNode(["panel1", "Slot", "button2", "Slot"]);
        cy.checkSelectedPropNodeAs("forked");

        cy.justLog(
          "If I unfork button2's prop, I would be forking panel's prop"
        );
        cy.clickSelectedTreeNodeContextMenu("Revert to");
        cy.checkSelectedPropNodeAs("default");

        cy.selectTreeNode(["panel1", "Slot"]);
        cy.checkSelectedPropNodeAs("forked");

        cy.justLog("Revert panel1 prop");
        cy.clickSelectedTreeNodeContextMenu("Revert to");
        cy.checkSelectedPropNodeAs("default");

        cy.justLog("Update button1 prop");
        cy.selectTreeNode(["panel1", "Slot", "button1", "Slot", "Button"]);
        cy.justType("{enter}");
        framed.enterIntoTplTextBlock("Howdy");
        cy.selectTreeNode(["panel1", "Slot", "button1", "Slot"]);
        cy.checkSelectedPropNodeAs("forked");
        framed.rootElt().contains("Howdy").should("exist");

        cy.justLog("Revert panel1 prop");
        cy.selectTreeNode(["panel1", "Slot"]);
        cy.clickSelectedTreeNodeContextMenu("Revert to");
        cy.checkSelectedPropNodeAs("default");
        framed.rootElt().contains("Howdy").should("not.exist");

        cy.justLog("Add a new button to panel1 prop");
        cy.insertFromAddDrawer("MyButton");
        cy.renameTreeNode("button4");
        cy.selectTreeNode(["panel1", "Slot", "button4", "Slot", "Button"]);
        cy.justType("{enter}");
        framed.enterIntoTplTextBlock("OMG");

        cy.justLog("panel1 prop is forked again, but all else okay");
        cy.selectTreeNode(["panel1", "Slot"]);
        cy.checkSelectedPropNodeAs("forked");
        cy.selectTreeNode(["panel1", "Slot", "button1", "Slot"]);
        cy.checkSelectedPropNodeAs("default");
        cy.selectTreeNode(["panel1", "Slot", "button2", "Slot"]);
        cy.checkSelectedPropNodeAs("forked");
        cy.selectTreeNode(["panel1", "Slot", "button4", "Slot"]);
        cy.checkSelectedPropNodeAs("forked");
      });

      cy.withinLiveMode(() => {
        cy.contains("Weird").should("exist");
        cy.contains("Howdy").should("not.exist");
        cy.contains("OMG").should("exist");
      });

      const checkEndState = () => {
        cy.waitAllEval();
        cy.getFramedByName("artboard").then((framed: Framed) => {
          framed.rootElt().contains("OMG").should("exist");
        });
        cy.checkNoErrors();
      };

      checkEndState();
      cy.undoAndRedo();
      checkEndState();
    });
  });
});
