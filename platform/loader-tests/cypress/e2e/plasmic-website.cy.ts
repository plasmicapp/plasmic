// @ts-ignore

import { isDynamicMode } from "../support/commands";

describe("Plasmic Website", () => {
  it("should render desktop", () => {
    cy.spyOnFetch("/").as("homeHtml");

    cy.visit("/");

    if (isDynamicMode()) {
      cy.waitForPlasmicDynamic();
    } else {
      cy.wait("@homeHtml")
        .its("response.body")
        .should("include", "Try Plasmic for free")
        .should("include", "Empower the whole team");
    }
    cy.contains("Try Plasmic for free").should("exist");
    cy.matchFullPageSnapshot("plasmic-website-home");

    cy.get(`a[href^="/pricing"]`).click();
    cy.contains("Unlimited projects").should("exist");
    cy.matchFullPageSnapshot("plasmic-website-pricing");

    cy.spyOnFetch("/cms").as("cmsHtml");
    cy.visit("/cms");

    if (!isDynamicMode()) {
      cy.wait("@cmsHtml")
        .its("response.body")
        .should("include", "Launch beautiful digital");
    }
    cy.contains("Launch beautiful digital").should("exist");
    cy.matchFullPageSnapshot("plasmic-website-cms");
  });

  it("should render mobile", () => {
    cy.viewport("iphone-x");

    cy.visit("/");

    if (isDynamicMode()) {
      cy.waitForPlasmicDynamic();
    }

    cy.contains("Try Plasmic for free").should("exist");
    cy.matchFullPageSnapshot("plasmic-website-home-mobile");

    cy.visit("/pricing");
    cy.contains("Unlimited projects").should("exist");
    cy.matchFullPageSnapshot("plasmic-website-pricing-mobile");
  });

  it("should render components", () => {
    if (Cypress.env("SKIP_COMPONENTS_TEST")) {
      return;
    }

    cy.spyOnFetch("/components").as("componentsHtml");

    cy.visit("/components");

    if (isDynamicMode()) {
      cy.waitForPlasmicDynamic();
    } else {
      cy.wait("@componentsHtml")
        .its("response.body")
        .should("include", "VERY COOL")
        .should("include", "already been a huge increase in efficiency");
    }

    cy.contains("VERY COOL").should("exist");
    cy.contains("James Armenta").should("exist");
    cy.matchFullPageSnapshot("plasmic-website-components");
  });
});
