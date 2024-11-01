describe("routing", () => {
  afterEach(() => {
    cy.removeCurrentProject();
  });

  it("should switch arenas", () => {
    cy.setupNewProject({
      name: "routing-arenas",
    }).then((projectId) => {
      cy.withinStudioIframe(() => {
        // New project should create a new arena called "Custom arena 1"
        cy.url().should(
          "include",
          `/-/Custom-arena-1?arena_type=custom&arena=Custom%20arena%201`
        );

        cy.justLog("Rename current arena");
        cy.projectPanel().contains("Custom arena 1").rightclick();
        cy.contains("Rename arena").click();
        cy.justType("FirstArena{enter}");
        cy.switchToImportsTab(); // we're just trying to close the projects panel
        cy.url().should(
          "include",
          `/-/FirstArena?arena_type=custom&arena=FirstArena`
        );

        cy.justLog("Creating pages and components");
        cy.createNewPage("My/Page");
        cy.createNewComponent("MyComponent");

        cy.justLog("Switching arenas with project panel");
        cy.projectPanel().contains("MyComponent").click();
        cy.url().should(
          "include",
          `/-/MyComponent?arena_type=component&arena=`
        );

        cy.projectPanel().contains("/my/page").click();
        cy.url().should("include", `/-/My-Page?arena_type=page&arena=`);
      });

      cy.justLog("Switching arenas with URL");

      cy.openProject({ projectId }).withinStudioIframe(() => {
        // visiting / should redirect us to the first arena
        cy.url().should(
          "include",
          `/-/FirstArena?arena_type=custom&arena=FirstArena`
        );
        cy.get("#proj-nav-button").contains("FirstArena");
      });

      cy.openProject({
        projectId,
        arenaType: "arena",
        arenaName: "NonExistentArena",
      }).withinStudioIframe(() => {
        // visiting /arena/NonExistentArena should redirect us to the first arena
        cy.url().should(
          "include",
          `/-/FirstArena?arena_type=custom&arena=FirstArena`
        );
        cy.get("#proj-nav-button").contains("FirstArena");
      });

      cy.openProject({
        projectId,
        appendPath: "/branch/main@latest/page/My%2FPage",
      }).withinStudioIframe(() => {
        // visiting old URL should redirect us to new URL
        cy.url().should("include", `/-/My%2FPage?arena_type=page&arena=`);
        cy.get("#proj-nav-button").contains("My/Page");
      });

      cy.openProject({
        projectId,
        appendPath: "/branch/main@latest/component/MyComponent",
      }).withinStudioIframe(() => {
        // visiting old URL should redirect us to new URL
        cy.url().should(
          "include",
          `/-/MyComponent?arena_type=component&arena=`
        );
        cy.get("#proj-nav-button").contains("MyComponent");
      });
    });
  });
});
