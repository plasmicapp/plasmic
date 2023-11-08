describe("left-panel", function () {
  it("shows a blue indicator and popover to the left of an element if any non-default property", function () {
    cy.setupNewProject({ name: "left-panel" })
      .withinStudioIframe(() => {
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
      })
      .removeCurrentProject();
  });
});
