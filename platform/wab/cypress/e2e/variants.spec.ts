import {
  HORIZ_CONTAINER_CAP,
  HORIZ_CONTAINER_LOWER,
  VARIANT_GROUP_CAP,
} from "../../src/wab/shared/Labels";
import {
  createNewComponent,
  removeCurrentProject,
  setupNewProject,
  undoAndRedo,
} from "../support/util";

describe("variants", function () {
  beforeEach(() => {
    setupNewProject({
      name: "variants",
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("can CRUD interaction variants, element variants, enable multiple variants, alter content", function () {
    cy.withinStudioIframe(() => {
      createNewComponent("Blah").then((framed) => {
        cy.focusFrameRoot(framed);

        cy.justLog("Convert to auto layout");
        cy.justType("{shift}A");
        cy.insertFromAddDrawer("Text");
        cy.justType("{enter}{enter}");
        framed.enterIntoTplTextBlock("hello");

        cy.justLog("Add Hover interaction variant");
        cy.addInteractionVariant("Hover");
        cy.variantsTab().contains("Hover").should("be.visible");

        cy.justLog("Override contents for interaction variant.");
        cy.getSelectedElt().dblclick({ force: true });
        framed.enterIntoTplTextBlock("goodbye");
        cy.getSelectedElt().should("contain.text", "goodbye");
        cy.deselectVariant("Interaction Variants", "Hover");
        cy.addVariantGroup("Role");
        cy.addVariantToGroup("Role", "Primary");

        cy.justLog("Add another variant");
        cy.addVariantToGroup("Role", "Secondary");
        cy.resetVariants();

        cy.justLog("Enable multi choice.");
        cy.switchToComponentDataTab();
        cy.doVariantGroupMenuCommand("Role", "Change type to");

        cy.justLog("Check that the interaction variant contents are gone.");
        cy.getSelectedElt().should("contain.text", "hello");

        cy.justLog(
          "Primary = Courier New, Secondary = 36px size, check combined CSS"
        );
        cy.selectVariant("Role", "Primary");
        cy.chooseFont("Courier");
        cy.deselectVariant("Role", "Primary");
        cy.selectVariant("Role", "Secondary");
        cy.chooseFontSize("36px");
        cy.activateVariantFromGroup("Role", "Primary")
          .getSelectedElt()
          .should("have.css", "font-family", '"Courier New"');
        cy.getSelectedElt()
          .should("have.css", "font-size", "36px")
          .resetVariants();

        cy.justLog(
          `Test variant combo:
          Size=small is 10px,
          Size=small AND Role=Primary is 11p`
        );
        cy.addVariantGroup("Size");
        cy.addVariantToGroup("Size", "small");
        cy.addVariantToGroup("Size", "large");
        cy.resetVariants();

        cy.selectVariant("Size", "small");
        cy.chooseFontSize("10px");
        cy.getSelectedElt().should("have.css", "font-size", "10px");

        cy.selectVariant("Role", "Primary");
        cy.chooseFontSize("11px");
        cy.getSelectedElt().should("have.css", "font-size", "11px");

        cy.resetVariants();
        cy.activateVariantFromGroup("Size", "small");
        cy.getSelectedElt().should("have.css", "font-size", "10px");

        cy.activateVariantFromGroup("Role", "Primary");
        cy.getSelectedElt().should("have.css", "font-size", "11px");

        cy.resetVariants();

        // TODO: test style inheritance tooltips
        cy.selectVariant("Role", "Secondary");
        cy.activateVariantFromGroup("Role", "Primary");

        cy.justLog("Add another element, should be conditionally shown.");
        framed.rootElt().click({ force: true });
        cy.insertFromAddDrawer(HORIZ_CONTAINER_CAP);

        framed.rootElt().contains(HORIZ_CONTAINER_LOWER).click({ force: true });
        cy.insertFromAddDrawer("More HTML elements", "More HTML elements");
        cy.insertFromAddDrawer("Unstyled text input", "<input type");

        cy.justLog("Select the child textbox.");
        cy.justType("{enter}");
        cy.justLog("Set placeholder style.");
        cy.toggleElementVariants();
        cy.addElementVariant("placeholder");
        cy.chooseFontSize("48px");
        cy.stopRecordingElementVariant();

        cy.switchToTreeTab();
        cy.withinLiveMode(() => {
          cy.get("input").should(
            "have.attr",
            "placeholder",
            "Some placeholder"
          );
          cy.contains("hello")
            .should("have.css", "font-family", '"Courier New"')
            .should("have.css", "font-size", "36px");
        });

        // Sadly, couldn't find a way to get computed placeholder style. You can
        // try getComputedStyle($selectedElt[0], "::placeholder").fontSize, but
        // that just returns the input's font size setting. See
        // https://codepen.io/yaaang/pen/JjGyVGJ for a dissection.

        cy.justLog("Delete element variants.");
        cy.doVariantMenuCommand(true, "Placeholder", "Delete");

        cy.justLog("Hide hello from Secondary, check that it's still there.");
        framed.rootElt().contains("hello").click({ force: true });
        cy.justType("{del}");
        cy.contains("Delete instead").should("be.visible");
        cy.variantsTab().contains("Primary").click();
        framed.rootElt().contains("hello").should("exist");

        cy.justLog("Really delete hello.");
        cy.justType("{cmd}z");
        cy.justType("{cmd}z");
        framed.rootElt().contains("hello").click({ force: true });
        cy.justType("{del}");
        cy.contains("Delete instead").click();
        cy.variantsTab().contains("Primary").click();
        framed.rootElt().contains("hello").should("not.exist");

        cy.justLog(`Delete ${VARIANT_GROUP_CAP}.`);
        cy.doVariantGroupMenuCommand("Role", "Delete");

        cy.justLog("Delete interaction variant.");
        cy.doVariantMenuCommand(false, "Hover", "Delete");

        function checkEndState() {
          cy.variantsTab().contains("Hover").should("not.exist");
          cy.variantsTab().contains("Role").should("not.exist");
          cy.variantsTab().contains("Primary").should("not.exist");
          cy.variantsTab().contains("Secondary").should("not.exist");
          cy.checkNoErrors();
        }

        checkEndState();
        undoAndRedo();
        checkEndState();
      });
    });
  });
});
