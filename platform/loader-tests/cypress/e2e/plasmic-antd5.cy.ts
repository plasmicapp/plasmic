describe("Plasmic Antd", () => {
  it("should work", () => {
    cy.visit("/");
    cy.get("input.ant-input").type("hello input!");
    cy.get("input.ant-input").should("have.attr", "value", "hello input!");
    cy.contains("hello input!").should("exist");

    cy.get("textarea.ant-input").type("hello textarea!");
    cy.get("textarea.ant-input").should("have.value", "hello textarea!");
    cy.contains("hello textarea!").should("exist");

    cy.contains("Not checked").should("exist");
    cy.get(".ant-checkbox-wrapper").click();
    cy.contains("Checked!").should("exist");

    cy.get(".ant-picker input").type("2013-06-20{enter}", { force: true });
    cy.contains("2013-06-20T").should("exist");

    cy.get("input.ant-radio-input[value='radio-option2']").click();
    cy.contains("radio-option2").should("exist");

    cy.contains("Switched off").should("exist");
    cy.get("button.ant-switch").click();
    cy.contains("Switched on!").should("exist");

    cy.visit("/forms");
    cy.get("input[id='name']").type("My Name");
    cy.get(
      ".ant-radio-group[id='message'] input.ant-radio-input[value='blue']"
    ).click();
    cy.contains(`{"name":"My Name","message":"blue"}`).should("exist");

    cy.get("input[id='my-name']").type("Another name");
    cy.get(
      ".ant-radio-group[id='my-color'] input.ant-radio-input[value='red']"
    ).click();
    cy.contains(`{"my-name":"Another name","my-color":"red"}`).should("exist");
  });
});
