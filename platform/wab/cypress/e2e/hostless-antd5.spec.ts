describe("hostless-antd", () => {
  it("works", () => {
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: [
        {
          name: "antd5",
          npmPkg: ["@plasmicpkgs/antd5"],
        },
      ],
    }).then(() => {
      // Create a project to use it
      cy.withinStudioIframe(() => {
        cy.createNewFrame().then((framed) => {
          cy.focusFrameRoot(framed);

          cy.insertFromAddDrawer("Vertical stack");
          cy.insertFromAddDrawer("plasmic-antd5-input");
          cy.insertFromAddDrawer("Text");
          cy.get(`[data-test-id="text-content"] label`).rightclick();
          cy.contains("Use dynamic value").click();
          cy.get(`[data-test-id="data-picker"]`).contains("input").click();
          cy.get(`[data-test-id="data-picker"]`)
            .contains("button", "Save")
            .click();

          cy.insertFromAddDrawer("plasmic-antd5-checkbox");
          cy.insertFromAddDrawer("Text");
          cy.get(`[data-test-id="text-content"] label`).rightclick();
          cy.contains("Use dynamic value").click();
          cy.contains("Switch to Code").click();
          cy.resetMonacoEditorToCode(
            '$state.checkbox.checked ? "Checkbox checked!" : "Checkbox not checked"'
          );

          cy.withinLiveMode(() => {
            cy.get(".ant-input").type("hello input!");
            cy.get(".ant-input").should("have.attr", "value", "hello input!");
            cy.contains("hello input!").should("exist");

            cy.contains("Checkbox not checked").should("exist");
            cy.get(".ant-checkbox-wrapper").click();
            cy.contains("Checkbox checked!").should("exist");
          });
        });
      });
    });
  });
});
