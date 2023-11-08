// @ts-ignore

import { isDynamicMode } from "../support/commands";

describe("Plasmic Basic Components", () => {
  it("should work", () => {
    cy.spyOnFetch("/").as("homeHtml");

    cy.visit("/");

    if (isDynamicMode()) {
      cy.waitForPlasmicDynamic();
    } else {
      cy.wait("@homeHtml").its("response.body").should("include", "Test embed");
    }
    cy.contains("Test embed").should("be.visible");
    cy.contains("Test embed").should(
      "have.css",
      "background-color",
      "rgb(255, 0, 0)"
    );
    cy.get("div.video-wrapper > video").should("exist");
    cy.get("div.iframe-wrapper > iframe").should("exist");
    cy.matchFullPageSnapshot("plasmic-basic-components-example");
  });
});
