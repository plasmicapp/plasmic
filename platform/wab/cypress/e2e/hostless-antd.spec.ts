describe("hostless-antd", () => {
  it("works", () => {
    cy.setupProjectWithHostlessPackages({
      hostLessPackagesInfo: {
        name: "antd",
        npmPkg: ["@plasmicpkgs/antd"],
      },
    }).then(() => {
      // Create a project to use it
      cy.withinStudioIframe(() => {
        cy.createNewFrame().then((framed) => {
          cy.focusFrameRoot(framed);

          cy.insertFromAddDrawer("Vertical stack");
          cy.insertFromAddDrawer("AntdInput");
          cy.insertFromAddDrawer("Text");
          cy.get(`[data-test-id="text-content"] label`).rightclick();
          cy.contains("Use dynamic value").click();
          cy.get(`[data-test-id="data-picker"]`).contains("antdInput").click();
          cy.get(`[data-test-id="data-picker"]`)
            .contains("button", "Save")
            .click();

          cy.insertFromAddDrawer("AntdCheckbox");
          cy.insertFromAddDrawer("Text");
          cy.get(`[data-test-id="text-content"] label`).rightclick();
          cy.contains("Use dynamic value").click();
          cy.contains("Switch to Code").click();
          cy.resetMonacoEditorToCode(
            '$state.antdCheckbox.value ? "Checkbox checked!" : "Checkbox not checked"'
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
