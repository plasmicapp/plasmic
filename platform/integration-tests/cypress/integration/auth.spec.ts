// Do not run this manually; see fullsync.spec.ts.
it("[cypress] successfully log in and authorize CLI token", () => {
  cy.visit(Cypress.env("AUTH_URL"))
    .get("input[name=email]")
    .type("testing@plasmic.app")
    .get("input[name=password]")
    .type("Plasmic1!")
    .get("button[type=submit]")
    .click()
    .root()
    .contains("button", "Authorize")
    .click()
    .root()
    .contains("close this tab");
});
