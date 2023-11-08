/**
 * This file is prefixed with 00 because this spec should run first.  It clears
 * the intro splash flag (e.g. we're running specs with a fresh DB reset, which
 * is what CI does).
 */

describe("Authentication", function () {
  it("login and logout", function () {
    cy.visit("/");

    // The very first step can take Cypress a long time to load for some reason,
    // esp. on jenkins.
    cy.get("input[name=email]", { timeout: 120000 }).type("user2@example.com");
    cy.get("input[name=password]").type("!53kr3tz!");
    cy.get("button[type=submit]").click();

    cy.contains('a[href="/projects"]', "All projects");

    // Disabled until we can get consistent screenshots across machines
    // See issue: https://github.com/cypress-io/cypress/issues/2102
    // cy.screenshot("check-onLogin");
    cy.get('[data-test-id="btn-dashboard-user"]').click();
    cy.wait(1000);
    cy.contains(".ant-dropdown", "Sign Out").click();
    cy.contains("Sign in with Google");
  });
});
