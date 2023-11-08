// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

import { addMatchImageSnapshotCommand } from "cypress-image-snapshot/command";
// @ts-ignore
import scrollToBottom from "scroll-to-bottomjs";

addMatchImageSnapshotCommand({
  comparisonMethod: "ssim",
  failureThreshold: 0.01,
  failureThresholdType: "percent",
  allowSizeMismatch: true,
});

Cypress.Commands.add("scrollToBottom", () => {
  cy.window().then({ timeout: 60000 }, (cyWindow) => {
    console.log("Scroll to bottom", scrollToBottom, cyWindow);
    return scrollToBottom({ remoteWindow: cyWindow, timing: 100 });
  });
});

const CODEGEN_TIMEOUT = 240000;

Cypress.Commands.add("waitForPlasmicDynamic", () => {
  const isDynamic = isDynamicMode();

  if (!isDynamic) {
    return;
  }

  cy.get(`.ρd__all`, { timeout: CODEGEN_TIMEOUT }).should("be.visible");

  if (isHtmlMode()) {
    cy.get(`[data-plasmic-hydrated="true"]`, {
      timeout: CODEGEN_TIMEOUT,
    }).should("exist");
  }
});

Cypress.Commands.add("spyOnFetch", (url: string) => {
  return cy.intercept(url, (req) => {
    req.followRedirect = true;
  });
});

Cypress.Commands.add("matchFullPageSnapshot", (name: string) => {
  cy.scrollToBottom();
  cy.document().matchImageSnapshot(name, {
    customDiffDir: Cypress.env("DIFF_OUTPUT_DIR"),
  });
});

export function isDynamicMode() {
  return Cypress.env("DYNAMIC");
}

export function isHtmlMode() {
  return Cypress.env("DYNAMIC_HTML");
}

declare global {
  namespace Cypress {
    interface Chainable {
      scrollToBottom(): Chainable;
      waitForPlasmicDynamic(): Chainable;
      spyOnFetch(url: string): Chainable;
      matchFullPageSnapshot(name: string): Chainable;
    }
  }
}
