// @ts-ignore

import { isDynamicMode } from "../support/commands";

describe("Plasmic Basic Components", () => {
  it("should work", () => {
    cy.spyOnFetch("/badge").as("homeHtml");

    cy.visit("/badge");

    if (isDynamicMode()) {
      cy.waitForPlasmicDynamic();
    } else {
      cy.wait("@homeHtml")
        .its("response.body")
        // Find "Hello Plasmic!" but ignore HTML comments from interpolation
        .should(
          "match",
          new RegExp(
            `Hello (${htmlCommentRegex.source})?Plasmic(${htmlCommentRegex.source})?!`
          )
        )
        .should("include", "You havent clicked")
        .should("include", "super-secret")
        .should("include", "I'm in the fetcher!");
    }
    cy.get('[data-test-id="badge"]')
      .should("be.visible")
      .should("have.css", "background-color", "rgb(51, 255, 0)")
      .contains("Hello Plasmic!")
      .should("exist");
    cy.contains("Click here").click();
    cy.wait(50);
    cy.contains("Click here").click();
    cy.contains("You clicked 2 times").should("be.visible");
    cy.contains("super-secret");
    cy.contains("I'm in the fetcher!");
    cy.matchFullPageSnapshot("plasmic-app-hosting-example");
  });
});

// From https://stackoverflow.com/questions/5653207/remove-html-comments-with-regex-in-javascript
const htmlCommentRegex = new RegExp(
  "<!--[\\s\\S]*?(?:-->)?" +
    "<!---+>?" +
    "|<!(?![dD][oO][cC][tT][yY][pP][eE]|\\[CDATA\\[)[^>]*>?" +
    "|<[?][^>]*>?"
);
