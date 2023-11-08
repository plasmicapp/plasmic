import {
  FREE_CONTAINER_CAP,
  FREE_CONTAINER_LOWER,
} from "../../src/wab/shared/Labels";
import { removeCurrentProject, setupNewProject } from "../support/util";

describe("components", function () {
  beforeEach(() => {
    setupNewProject({
      name: "components",
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("can extract, instantiate, drill, add variants, undo select", function () {
    cy.withinStudioIframe(() => {
      cy.createNewFrame().then((framed) => {
        // Add a child.
        cy.focusFrameRoot(framed);
        cy.insertFromAddDrawer(FREE_CONTAINER_CAP);
        cy.justType("{enter}");

        // Extract it as a component.
        cy.extractComponentNamed("Widget");

        // Open component in its own frame.
        cy.waitForNewFrame(() => {
          cy.projectPanel().contains("Widget").rightclick();
          cy.contains("in new artboard").click({ force: true });
        }).then((framed2) => {
          // Back to the first component.
          cy.justType("n");

          // Drill into the instance.
          cy.focusFrameRoot(framed);
          framed.rootElt().children().dblclick({ force: true });

          // Turn on auto-layout.
          cy.justType("{shift}A");

          // Add new child element.
          cy.justType("r");
          cy.drawRectRelativeToElt(framed.getFrame(), 1, 1, 10, 10);
          cy.switchToDesignTab();
          cy.expandSection("size-section");
          cy.setSelectedDimStyle("width", "stretch");
          cy.setSelectedDimStyle("height", "stretch");
          cy.setSelectedDimStyle("min-width", "20px");
          cy.setSelectedDimStyle("min-height", "20px");

          // Add variant.
          cy.addVariantGroup("WidgetRole");
          cy.addVariantToGroup("WidgetRole", "Blah");

          // Hide current element for that variant.
          cy.justType("{enter}{del}");
          cy.contains("Delete instead").should("be.visible");

          // Focus on parent
          cy.justType("{shift}{enter}");

          // Add block for that variant.
          cy.insertFromAddDrawer(FREE_CONTAINER_CAP);

          // Pop out of the component.
          cy.focusFrameRoot(framed);
          cy.expectDebugTplTree(`
${FREE_CONTAINER_LOWER}
  Widget`);

          // Focus the next frame
          cy.justType("n");
          cy.expectDebugTplTree(`
${FREE_CONTAINER_LOWER}
  ${FREE_CONTAINER_LOWER}
  ${FREE_CONTAINER_LOWER}`);

          // Drill back into the instance.
          cy.focusFrameRoot(framed);
          framed.rootElt().children().children().dblclick({ force: true });

          // Click into the other frame.
          cy.focusFrameRoot(framed2);

          // Select the artboard.
          cy.justType("{shift}{enter}");

          // Go back to frame 1
          cy.focusFrameRoot(framed);
          cy.justType("{shift}1");

          // Insert another widget
          cy.insertFromAddDrawer("Widget");
          cy.expectDebugTplTree(`
${FREE_CONTAINER_LOWER}
  Widget
  Widget`);
          cy.getSelectionTag().should("contain", "Widget");

          // Set its position
          cy.setSelectedPosition("top", "100px");
          cy.setSelectedPosition("left", "75px");
          cy.setSelectedDimStyle("width", "200px");
          cy.setSelectedDimStyle("height", "300px");

          cy.getSelectedElt()
            .should("have.css", "top", "100px")
            .should("have.css", "left", "75px")
            .should("have.css", "width", "200px")
            .should("have.css", "height", "300px");

          // Convert frame1 into a component too
          cy.focusFrameRoot(framed);
          cy.justType("{cmd}{alt}k");
          cy.submitPrompt("Funky");

          cy.withinLiveMode(() => {
            cy.get(".plasmic_page_wrapper > div > :nth-child(2)")
              .should("have.css", "top", "100px")
              .should("have.css", "left", "75px")
              .should("have.css", "width", "200px")
              .should("have.css", "height", "300px");
          });

          function checkEndState() {
            cy.waitAllEval();

            cy.expectDebugTplTreeForFrame(
              0,
              `
${FREE_CONTAINER_LOWER}
  Widget
  Widget`
            );
            cy.expectDebugTplTreeForFrame(
              1,
              `
${FREE_CONTAINER_LOWER}
  ${FREE_CONTAINER_LOWER}
  ${FREE_CONTAINER_LOWER}`
            );

            // Make sure that we are selecting the artboard. This is due to
            // a flakiness in the redo logic. If we ensure that the selection
            // state is the same after undoing/redoing, we can stop doing
            // this.
            cy.justType("{shift}{enter}");
            cy.justType("{shift}{enter}");

            // Check that we're on the first artboard.
            cy.getSelectionTag().should("contain", "Funky");

            cy.checkNoErrors();
          }

          checkEndState();
          cy.undoAndRedo();
          checkEndState();

          cy.wait(500);
          cy.codegen().then((bundle) => {
            console.log("codegen bundle", bundle);
            expect(bundle.components.length).to.equal(2);
            const widgetComp = bundle.components.find(
              (c: any) => c.renderModuleFileName === "PlasmicWidget.tsx"
            );
            expect(widgetComp).to.not.be.null;
            expect(widgetComp.cssRules).to.not.include("top: 100px");
            expect(widgetComp.cssRules).to.include("min-width: 20px");
            expect(widgetComp.cssRules).to.include("min-height: 20px");

            const funkyComp = bundle.components.find(
              (c: any) => c.renderModuleFileName === "PlasmicFunky.tsx"
            );
            expect(funkyComp).to.not.be.null;
            expect(funkyComp.cssRules).to.include(`top: 100px`);
            expect(funkyComp.cssRules).to.include(`left: 75px`);
            expect(funkyComp.cssRules).to.include(`width: 200px`);
            expect(funkyComp.cssRules).to.include(`height: 300px`);
          });
        });
      });
    });
  });
});
