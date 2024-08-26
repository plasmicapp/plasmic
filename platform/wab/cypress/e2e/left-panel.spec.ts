import { VERT_CONTAINER_CAP } from "../../src/wab/shared/Labels";
import { removeCurrentProject, setupNewProject } from "../support/util";

describe("left-panel", function () {
  beforeEach(() => {
    setupNewProject({
      name: "left-panel",
    });
  });

  afterEach(() => {
    removeCurrentProject();
  });

  it("shows a blue indicator and popover to the left of an element if any non-default property", function () {
    cy.withinStudioIframe(() => {
      cy.createNewFrame().focusCreatedFrameRoot().insertFromAddDrawer("Text");
      cy.getSelectedTreeNode().within(() => {
        cy.get(`[data-test-class="left-panel-indicator"] > div`).trigger(
          "mouseover"
        );
      });
      cy.get(`[data-test-class="indicator-clear"]`).each(($el) =>
        cy.wrap($el).click({ force: true })
      );

      cy.getSelectedTreeNode().within(() => {
        cy.get(`[data-test-class="left-panel-indicator"] > div`).should(
          "exist"
        );
      });
    });
  });

  it("should allow copy and paste from outline", () => {
    cy.withinStudioIframe(() => {
      cy.createNewFrame().then((framed) => {
        cy.focusFrameRoot(framed);
        cy.insertFromAddDrawer(VERT_CONTAINER_CAP);

        const dataTransfer = new DataTransfer();
        cy.getSelectedTreeNode().trigger("copy", {
          clipboardData: dataTransfer,
        });
        cy.wait(100);

        const PASTES_COUNT = 20;

        // Paste multiple times, to be sure that the scroller will appear
        for (let i = 0; i < PASTES_COUNT; i++) {
          cy.getSelectedTreeNode().trigger("paste", {
            clipboardData: dataTransfer,
          });
          cy.wait(50);
        }

        // Click again to emulate the make the scroller receive the focus
        cy.getSelectedTreeNode().realClick();
        cy.wait(500);

        const dataTransfer2 = new DataTransfer();
        cy.getSelectedTreeNode().trigger("copy", {
          clipboardData: dataTransfer2,
        });
        cy.wait(100);

        cy.getSelectedTreeNode().trigger("paste", {
          clipboardData: dataTransfer2,
        });

        cy.wait(100);

        cy.curWindow().then((win) => {
          // Checking directly in the model, because the dom will not include elements that aren't visible
          const dbg = (win as any).dbg;
          const { studioCtx } = dbg;
          const viewCtx = studioCtx.focusedViewCtx();
          const node = viewCtx.focusedTpl();
          // original + multiple pastes + 1 paste
          expect(node.parent.children.length).to.equal(1 + PASTES_COUNT + 1);
        });
      });
    });
  });
});
