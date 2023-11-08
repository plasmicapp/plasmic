describe("Plasmic Antd", () => {
  it("should work", () => {
    cy.visit("/");
    cy.get(".ant-input").type("hello input!");
    cy.get(".ant-input").should("have.attr", "value", "hello input!");
    cy.contains("hello input!").should("exist");

    cy.contains("no checkee").should("exist");
    cy.get(".ant-checkbox-wrapper").click();
    cy.contains("CHECKED YO!").should("exist");

    // Not sure why select doesn't work on jenkins cypress :-/
    // Cypress cannot seem to make that click on .ant-select
    // cy.get(".ant-select").click({ force: true });
    // cy.contains("Option 2").click();
    // cy.contains("op2").should("exist");

    cy.contains("Collapse1").click();
    cy.contains("Collapse1 stuff").should("be.visible");
    cy.contains("Collapse1").click();
    cy.contains("Collapse1 stuff").should("not.be.visible");

    cy.visit("/page2");
    cy.contains("Tab2 content").should("be.visible");
    cy.contains("Tab1").click();
    // after rendering, just gets hidden
    cy.contains("Tab2 content").should("not.be.visible");
    cy.contains("Tab1 content").should("be.visible");
  });
});
