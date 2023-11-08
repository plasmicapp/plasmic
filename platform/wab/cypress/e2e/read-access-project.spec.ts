describe("read-access-project", function () {
  it("allows external users to see other projects in read mode.", function () {
    cy.setupNewProject({ name: "read-access-project" }).then(
      (projectId: string) => {
        cy.withinStudioIframe(() => {
          cy.createNewFrame();
        })
          .wait(1000)
          .clearCookies()
          .login("user@example.com")
          .openProject({ projectId });
      }
    );
    cy.withinStudioIframe(() => {
      cy.get('[data-test-id="alert-banner-dismiss"]').click();
    });
    cy.removeCurrentProject();
  });
  it("allows anonymous users to see projects marked public", function () {
    cy.setupNewProject({ name: "read-access-project" }).then(
      (projectId: string) => {
        cy.request({
          url: `/api/v1/projects/${projectId}`,
          method: "put",
          body: { readableByPublic: true },
        });
        cy.withinStudioIframe(() => {
          cy.createNewFrame();
        })
          .wait(1000)
          .logout()
          .clearCookies()
          .visit(`/projects/${projectId}`);
      }
    );
    cy.withinStudioIframe(() => {
      cy.get('[data-test-id="alert-banner-dismiss"]').click();
    });
    cy.removeCurrentProject();
  });
});
