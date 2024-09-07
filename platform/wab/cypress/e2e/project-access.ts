describe("project-access", function () {
  afterEach(() => {
    cy.removeCurrentProject("user@example.com");
  });
  it("does not allow other users to view project by default", function () {
    cy.setupNewProject({
      name: "project-access",
      email: "user@example.com",
    }).then((projectId: string) => {
      // Logged out
      cy.wait(1000);
      cy.clearCookies();
      cy.openProject({ projectId });
      cy.location("href").should(
        "contains",
        `/login?continueTo=%2Fprojects%2F${projectId}`
      );

      // Log in as another user
      cy.login("user2@example.com");
      cy.openProject({ projectId });
      cy.contains("Could not open project").should("be.visible");
    });
  });
  it("allows other users to view project if inviteOnly: false", function () {
    cy.setupNewProject({
      name: "project-access",
      email: "user@example.com",
      inviteOnly: false,
    }).then((projectId: string) => {
      // Logged out
      cy.wait(1000);
      cy.clearCookies();
      cy.openProject({ projectId });
      cy.location("href").should(
        "contains",
        `/login?continueTo=%2Fprojects%2F${projectId}`
      );

      // Log in as another user
      cy.login("user2@example.com");
      cy.openProject({ projectId });
      cy.withinStudioIframe(() => {
        cy.contains("You only have read permission to this project").should(
          "be.visible"
        );
      });
    });
  });
  it("allows other users to edit project if inviteOnly: false and defaultAccessLevel: editor", function () {
    cy.setupNewProject({
      name: "project-access",
      email: "user@example.com",
      inviteOnly: false,
      defaultAccessLevel: "editor",
    }).then((projectId: string) => {
      // Logged out
      cy.wait(1000);
      cy.clearCookies();
      cy.openProject({ projectId });
      cy.location("href").should(
        "contains",
        `/login?continueTo=%2Fprojects%2F${projectId}`
      );

      // Log in as another user
      cy.login("user2@example.com");
      cy.openProject({ projectId });
      cy.withinStudioIframe(() => {
        cy.createNewFrame(); // tests that the project is editable
      });
    });
  });
});
