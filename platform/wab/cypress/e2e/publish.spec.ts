describe("publish", function () {
  it("allows external users to see other projects in read mode.", function () {
    cy.setupNewProject({ name: "publish" })
      .then(() => {
        cy.withinStudioIframe(() => {
          cy.createNewFrame().then((framed) => {
            cy.focusFrameRoot(framed);
            // Add text and publish first version
            cy.insertFromAddDrawer("Text");
            cy.justType("{enter}{enter}");
            framed.enterIntoTplTextBlock("hello");
            cy.publishVersion("first version");
            // Edit text and publish new version
            cy.getSelectedElt().dblclick({ force: true });
            framed.enterIntoTplTextBlock("goodbye");
            cy.publishVersion("second version");
            // Preview first version and check if you see the previous text
            cy.previewVersion("first version");
            cy.selectTreeNode(["hello"]);
            cy.getSelectedElt().should("contain.text", "hello");
          });
          // Go back to current version
          cy.waitForNewFrame(
            () => {
              cy.contains("Back to current version").click();
            },
            { skipWaitInit: true }
          ).then(() => {
            cy.selectTreeNode(["goodbye"]);
            cy.getSelectedElt().should("contain.text", "goodbye");
            // Revert to first version and check if text goes back to the previous one
            cy.revertToVersion("first version");
            cy.selectTreeNode(["hello"]);
            cy.getSelectedElt().should("contain.text", "hello");
          });
        });
        // Reload and check if you're still on the reverted version
        cy.reload();
        cy.withinStudioIframe(() => {
          cy.waitForFrameToLoad();
          cy.selectTreeNode(["hello"]);
          cy.getSelectedElt().should("contain.text", "hello");
        });
      })
      .then(() => {
        cy.removeCurrentProject();
      });
  });
});
