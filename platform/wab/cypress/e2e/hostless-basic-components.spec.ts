describe("hostless-basic-components", function () {
  it("can extract, instantiate, drill, add variants, undo select", function () {
    // Create hostless plasmic project
    cy.setupHostlessProject({
      name: "plasmic-basic-components",
      npmPkg: "@plasmicpkgs/plasmic-basic-components",
    })
      .then((hostlessProjectId: string) => {
        // Create a project to use it
        cy.setupNewProject({
          email: "admin@admin.example.com",
        })
          .then(() => {
            cy.withinStudioIframe(() => {
              // Import the hostless project
              cy.importProject(hostlessProjectId);
              // Test the components
              cy.createNewFrame().then((framed) => {
                cy.focusFrameRoot(framed);
                // Add Embed HTML with a div
                cy.insertFromAddDrawer("hostless-embed");
                cy.contains("Paste your embed code").click();
                cy.get(".react-monaco-editor-container").click();
                cy.justType(`{cmd}a{backspace}`);
                cy.justType(
                  `<div style="background-color: rgb(255, 0, 0)">Test embed</div>`
                );
                cy.justType(`{cmd}s`);
                cy.closeMonacoEditor();

                // Ensure the div rendered correctly in the artboard and live frame
                cy.getSelectedElt()
                  .children()
                  .should("contain.text", "Test embed");
                cy.getSelectedElt().children().should("be.visible");
                cy.getSelectedElt()
                  .children()
                  .should("have.css", "background-color", "rgb(255, 0, 0)");
                cy.withinLiveMode(() => {
                  cy.contains("Test embed").should("be.visible");
                  cy.contains("Test embed").should("be.visible");
                  cy.should("have.css", "background-color", "rgb(255, 0, 0)");
                });
                // Ensure no errors happened
                cy.checkNoErrors();
              });
            });
          })
          .then(() => {
            cy.removeCurrentProject("admin@admin.example.com").then(() => {
              Cypress.env("projectId", hostlessProjectId);
            });
          });
      })
      .then(() => {
        cy.removeCurrentProject("admin@admin.example.com");
      });
  });
});
