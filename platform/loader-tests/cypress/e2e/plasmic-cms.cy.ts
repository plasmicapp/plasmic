// @ts-ignore

describe("Plasmic CMS", () => {
  it("should work", () => {
    cy.spyOnFetch("/").as("homeHtml");
    cy.visit("/");
    cy.wait("@homeHtml")
      .its("response.body")
      .should("include", "First blog post");
    cy.contains("First blog post");
    cy.matchFullPageSnapshot("plasmic-cms");
  });
});
