import { HORIZ_CONTAINER_CAP } from "../../src/wab/shared/Labels";
import { removeCurrentProject, setupNewProject } from "../support/util";

describe("Right panel", () => {
  beforeEach(() =>
    setupNewProject({
      name: "right-panel",
    })
  );

  afterEach(() => {
    removeCurrentProject();
  });

  it("successfully test all right panel configurations", () => {
    const focusFrame = () => {
      return cy
        .get("[data-test-frame-uid]")
        .its("0.contentDocument.body")
        .should("not.be.empty")
        .then(cy.wrap);
    };
    cy.withinStudioIframe(() => {
      cy.createNewFrame().then((framed) => {
        cy.focusFrameRoot(framed);
        cy.insertFromAddDrawer(HORIZ_CONTAINER_CAP);
        const stackName = "testStack";
        const textName = "testText";
        cy.renameTreeNode(stackName);
        cy.insertFromAddDrawer("Text")
          .then(focusFrame)
          .find(".__wab_editor")
          .wait(1000)
          .dblclick({ force: true })
          .type("{selectall}{backspace}This is a text to test{esc}", {
            delay: 100,
          })
          .setSelectedDimStyle("width", "150px")
          .setSelectedDimStyle("height", "25px");
        cy.renameTreeNode(textName);
        cy.selectTreeNode([stackName]);

        testSizeSection();
        testVisibilitySection();

        cy.checkNoErrors();
      });
    });
  });
});

function testSizeSection() {
  cy.setSelectedDimStyle("width", "250px")
    .getSelectedElt()
    .should("have.css", "width", "250px");
  cy.setSelectedDimStyle("width", "stretch")
    .getSelectedElt()
    .should("have.css", "width", "800px");
  cy.setSelectedDimStyle("width", "hug content")
    .getSelectedElt()
    .should("have.css", "width", "150px");

  cy.setSelectedDimStyle("height", "250px")
    .getSelectedElt()
    .should("have.css", "height", "250px");
  cy.setSelectedDimStyle("height", "stretch")
    .getSelectedElt()
    .should("have.css", "height", "800px");
  cy.setSelectedDimStyle("height", "hug content")
    .getSelectedElt()
    .should("have.css", "height", "25px");

  cy.expandSection("size-section");

  cy.setSelectedDimStyle("min-width", "200px")
    .getSelectedElt()
    .should("have.css", "min-width", "200px");
  cy.setSelectedDimStyle("min-height", "200px")
    .getSelectedElt()
    .should("have.css", "min-height", "200px");
  cy.setSelectedDimStyle("max-width", "250px")
    .getSelectedElt()
    .should("have.css", "max-width", "250px");
  cy.setSelectedDimStyle("max-height", "250px")
    .getSelectedElt()
    .should("have.css", "max-height", "250px");

  cy.clickDataPlasmicProp("flex-grow")
    .getSelectedElt()
    .should("have.css", "flex-grow", "1");
  cy.clickDataPlasmicProp("flex-grow")
    .getSelectedElt()
    .should("have.css", "flex-grow", "0");

  cy.clickDataPlasmicProp("flex-shrink")
    .getSelectedElt()
    .should("have.css", "flex-shrink", "0");
  cy.clickDataPlasmicProp("flex-grow")
    .getSelectedElt()
    .should("have.css", "flex-grow", "1");

  cy.setSelectedDimStyle("flex-basis", "100px")
    .getSelectedElt()
    .should("have.css", "flex-basis", "100px");
}

function testVisibilitySection() {
  cy.setSelectedDimStyle("opacity", "50")
    .getSelectedElt()
    .should("have.css", "opacity", "0.5");

  cy.clickDataPlasmicProp("display-not-visible")
    .getSelectedElt()
    .should("have.css", "display", "none");

  cy.get(`[data-test-id="visibility-choices"]`)
    .rightclick()
    .clickDataPlasmicProp("display-not-rendered")
    .get(".__wab_text")
    .should("not.exist");

  cy.clickDataPlasmicProp("display-visible")
    .getSelectedElt()
    .should("have.css", "display", "flex");

  cy.setSelectedDimStyle("opacity", "100")
    .getSelectedElt()
    .should("have.css", "opacity", "1");
}
