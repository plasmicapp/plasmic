// @ts-ignore

import { isDynamicMode } from "../support/commands";

const SPLIT_ID = "j7cCxfS-Vu";
const SLICE_0_ID = "I4hoVVeME_";
const SLICE_1_ID = "6z5_V8jUij";
const SPLIT_ID_SEEDED_VALUES = [
  0.11585319298319519, 0.8782152701169252, 0.6021742431912571,
  0.9922364698722959, 0.5965731733012944, 0.7100605412852019,
  0.9641424147412181, 0.26073859352618456, 0.7413646157365292,
  0.08760438184253871, 0.5860531870275736, 0.2905445359647274,
  0.25139985512942076, 0.5985108413733542, 0.34386746119707823,
  0.48398651531897485,
];

describe("Plasmic Splits", () => {
  it("should render root page from plasmic with active experiment", () => {
    cy.setCookie("plasmic_seed", "1"); // plasmic_seed=1 -> 0.8782152701169252, should active experiment

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

  it("should render root page from plasmic with inactive experiment", () => {
    cy.setCookie("plasmic_seed", "0"); // plasmic_seed=0 -> 0.11585319298319519, should not active experiment

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

    cy.matchFullPageSnapshot("plasmic-splits-home-inactive"); // match without caring with origin (nextjs or not)
  });

  it("should render segment page", () => {
    // segment page should be rendered using nextjs SSR getActiveVariation which uses the ${type}.${id} cookie
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

    cy.matchFullPageSnapshot("plasmic-splits-home-segment"); // match without caring with origin (nextjs or not
  });

  it("should render schedule page", () => {
    // schedule page should be rendered using nextjs SSR getActiveVariation which uses the ${type}.${id} cookie
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

    cy.matchFullPageSnapshot("plasmic-splits-home-schedule"); // match without caring with origin (nextjs or not
  });

  it("should render custom page with custom trait", () => {
    cy.spyOnFetch("/custom?utm_campaign=myfirstcampaign").as("homeHtml");

    cy.visit("/custom?utm_campaign=myfirstcampaign");

    if (isDynamicMode()) {
      cy.waitForPlasmicDynamic();
    } else {
      cy.wait("@homeHtml")
        .its("response.body")
        .should("include", "This is my campaign page");
    }

    cy.contains("This is my campaign page").should("exist");

    cy.contains("You are seeing a campaign segment").should("exist");

    cy.matchFullPageSnapshot("plasmic-nextjs-splits-custom-active");
  });

  it("should render custom page with custom trait (inactive)", () => {
    cy.spyOnFetch("/custom?utm_campaign=nocampaign").as("homeHtml");

    cy.visit("/custom?utm_campaign=nocampaign");

    if (isDynamicMode()) {
      cy.waitForPlasmicDynamic();
    } else {
      cy.wait("@homeHtml")
        .its("response.body")
        .should("include", "This is my campaign page");
    }

    cy.contains("This is my campaign page").should("exist");

    cy.contains("NO CAMPAIGN HERE").should("exist");

    cy.matchFullPageSnapshot("plasmic-nextjs-splits-custom-inactive");
  });

  it("should get external ids and render it", () => {
    cy.setCookie(`plasmic:exp.${SPLIT_ID}`, `${SLICE_0_ID}`);
    cy.spyOnFetch("/external?utm_campaign=nocampaign").as("homeHtml");

    cy.visit("/external?utm_campaign=nocampaign");

    if (isDynamicMode()) {
      cy.waitForPlasmicDynamic();
    } else {
      cy.wait("@homeHtml")
        .its("response.body")
        .should("include", "External ids");
    }

    cy.contains("External ids").should("exist");

    cy.contains("ext-experiment: ext-experiment-a").should("exist");
    cy.contains("ext-utm-campaign: ext-utm-campaign-a").should("exist");

    cy.matchFullPageSnapshot("plasmic-nextjs-splits-external-nocampaign");
  });

  it("should get external ids and render it (campaign)", () => {
    cy.setCookie(`plasmic:exp.${SPLIT_ID}`, `${SLICE_1_ID}`);
    cy.spyOnFetch("/external?utm_campaign=myfirstcampaign").as("homeHtml");

    cy.visit("/external?utm_campaign=myfirstcampaign");

    if (isDynamicMode()) {
      cy.waitForPlasmicDynamic();
    } else {
      cy.wait("@homeHtml")
        .its("response.body")
        .should("include", "External ids");
    }

    cy.contains("External ids").should("exist");

    cy.contains("ext-experiment: ext-experiment-b").should("exist");
    cy.contains("ext-utm-campaign: ext-utm-campaign-b").should("exist");

    cy.matchFullPageSnapshot("plasmic-nextjs-splits-external-campaign");
  });
});
