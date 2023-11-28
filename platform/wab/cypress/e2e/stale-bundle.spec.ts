import { Framed } from "../support/util";

/**
 * This test is to ensure that new migrations will not break projects that
 * haven't migrated yet to the latest versions.
 *
 * If this bundle is too old, use `yarn db:upgrade-stale-bundle` to upgrade it
 * to the appropriate version (see command instructions).
 */
describe("Can use stale bundle", function () {
  it("Can migrate stale bundle", function () {
    // Create the site from the stale bundle
    cy.setupProjectFromTemplate("stale-bundle", { skipVisit: true }).then(
      (projectId) => {
        cy.openProject({
          projectId,
          qs: {
            ccStubs: true,
          },
        }).withinStudioIframe(() => {
          cy.waitForFrameToLoad();
          cy.curDocument()
            .get(".canvas-editor__frames .canvas-editor__viewport")
            .then(($frame) => {
              const frame = $frame[0] as HTMLIFrameElement;
              return new Framed(frame);
            })
            .then((framed: Framed) => {
              // Edit the project and save to make sure it's passing site invariants
              cy.switchToTreeTab()
                .selectTreeNode(["vertical stack", "Button"])
                .justType("{shift}2")
                .getSelectedElt()
                .should("contain.text", "Button")
                .justType("{enter}");
              framed.enterIntoTplTextBlock(`AntdBtn`);
              cy.selectTreeNode(["vertical stack", "AntdBtn"]);
              cy.checkNoErrors();
              cy.waitForSave();
            });
        });
      }
    );
  });
});
