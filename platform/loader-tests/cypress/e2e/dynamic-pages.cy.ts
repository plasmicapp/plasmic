// @ts-ignore

describe("Dynamic pages", () => {
  it("should work", () => {
    cy.visit("/");
    cy.contains("Donald Knuth").click();
    cy.title().should("eq", "Donald Knuth");
    cy.matchFullPageSnapshot("dynamic-pages");
  });
});
