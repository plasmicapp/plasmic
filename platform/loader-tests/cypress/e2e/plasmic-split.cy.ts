// @ts-ignore

import { isDynamicMode } from "../support/commands";

const SPLIT_ID = "j7cCxfS-Vu";
const SLICE_0_ID = "I4hoVVeME_";
const SLICE_1_ID = "6z5_V8jUij";

describe("Plasmic Splits", () => {
  it("should render root page from plasmic", () => {
    cy.setCookie(`plasmic:exp.${SPLIT_ID}`, `${SLICE_1_ID}`);

    cy.spyOnFetch("/").as("homeHtml");

    cy.visit("/");

    if (isDynamicMode()) {
      cy.waitForPlasmicDynamic();
    } else {
      cy.wait("@homeHtml")
        .its("response.body")
        .should("include", "Split testing page");
    }

    cy.contains("Split testing page").should("exist");

    cy.contains("active experiment").should("exist");
    cy.contains("inactive segment").should("exist");
    cy.contains("active schedule").should("exist");

    cy.matchFullPageSnapshot("plasmic-splits-home");
  });

  it("should render segment page", () => {
    cy.setCookie(`plasmic:exp.${SPLIT_ID}`, `${SLICE_1_ID}`);

    cy.spyOnFetch("/segment").as("homeHtml");

    cy.visit("/segment");

    if (isDynamicMode()) {
      cy.waitForPlasmicDynamic();
    } else {
      cy.wait("@homeHtml")
        .its("response.body")
        .should("include", "Split testing page");
    }

    cy.contains("Split testing page").should("exist");

    cy.contains("active experiment").should("exist");
    cy.contains("active segment").should("exist");
    cy.contains("active schedule").should("exist");

    cy.matchFullPageSnapshot("plasmic-splits-home-segment");
  });

  it("should render schedule page", () => {
    cy.setCookie(`plasmic:exp.${SPLIT_ID}`, `${SLICE_1_ID}`);

    cy.spyOnFetch("/schedule").as("homeHtml");

    cy.visit("/schedule");

    if (isDynamicMode()) {
      cy.waitForPlasmicDynamic();
    } else {
      cy.wait("@homeHtml")
        .its("response.body")
        .should("include", "Split testing page");
    }

    cy.contains("Split testing page").should("exist");

    cy.contains("active experiment").should("exist");
    cy.contains("inactive schedule").should("exist");
    cy.contains("inactive schedule").should("exist");

    cy.matchFullPageSnapshot("plasmic-splits-home-schedule");
  });

  it("should render experiment based on cookie", () => {
    cy.setCookie(`plasmic:exp.${SPLIT_ID}`, `${SLICE_0_ID}`);

    cy.spyOnFetch("/").as("homeHtml");

    cy.visit("/");

    if (isDynamicMode()) {
      cy.waitForPlasmicDynamic();
    } else {
      cy.wait("@homeHtml")
        .its("response.body")
        .should("include", "Split testing page");
    }

    cy.contains("Split testing page").should("exist");

    cy.contains("inactive experiment").should("exist");
    cy.contains("inactive segment").should("exist");
    cy.contains("active schedule").should("exist");

    cy.matchFullPageSnapshot("plasmic-splits-home-experiment");

    cy.clearCookie("plasmic:exp.j7cCxfS");
  });
});
