import "cypress-real-events";
import * as utils from "../support/util";
import { cyRequestDefaultOptions } from "../support/util";
import Chainable = Cypress.Chainable;

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
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

type Utils = typeof utils;

type ChainableUtils = {
  [k in keyof Utils]: Utils[k] extends (...args: any[]) => any
    ? (...args: Parameters<Utils[k]>) => Chainable
    : Utils[k];
};

declare global {
  namespace Cypress {
    // eslint-disable-next-line no-shadow
    interface Chainable extends ChainableUtils {
      focusCreatedFrameRoot(): Chainable;
      selection(fn: ($el: Cypress.ObjectLike) => void): Chainable;
      setSelection(query: string | Selection): Chainable;
    }
  }
}

Cypress.Commands.overwrite("request", (originalFn, ...args) => {
  let options: Partial<Cypress.RequestOptions> = {};
  if (typeof args[0] === "object") {
    options = Object.assign({}, args[0]);
  } else if (args.length === 1) {
    [options.url] = args;
  } else if (args.length === 2) {
    [options.method, options.url] = args;
  } else if (args.length === 3) {
    [options.method, options.url, options.body] = args;
  }
  return originalFn(Object.assign({}, cyRequestDefaultOptions, options));
});

/**
 * Just adding support for the {mod modifier for cross-platform testing.
 */
Cypress.Commands.overwrite("type", (originalFn, subject, string, options) =>
  originalFn(
    subject,
    string.replace(/{mod/g, Cypress.platform === "darwin" ? "{cmd" : "{ctrl"),
    options
  )
);

Object.entries(utils).forEach(([name, fn]) =>
  Cypress.Commands.add(name, (...args: any[]) => {
    Cypress.log({ name: `🌈 ${name}` });
    return (fn as Function).apply(null, args);
  })
);

Cypress.Commands.add(
  "focusCreatedFrameRoot",
  { prevSubject: true },
  (subject: utils.Framed) => {
    utils.focusFrameRoot(subject);
    return cy.wrap(subject);
  }
);

// The text selection commands for Cypress below are based in:
// - https://gist.github.com/erquhart/37bf2d938ab594058e0572ed17d3837a
// - https://github.com/netlify/netlify-cms/blob/a4b7481a99f58b9abe85ab5712d27593cde20096/cypress/support/commands.js#L180
Cypress.Commands.add("selection", { prevSubject: true }, (subject, fn) => {
  cy.wrap(subject).trigger("mousedown").then(fn).trigger("mouseup");
  cy.document().trigger("selectionchange");
  return cy.wrap(subject);
});
Cypress.Commands.add(
  "setSelection",
  { prevSubject: true },
  (subject, query, endQuery) => {
    return cy.wrap(subject).selection(($el) => {
      if (typeof query === "string") {
        const anchorNode = getTextNode($el[0], query);
        const focusNode = endQuery ? getTextNode($el[0], endQuery) : anchorNode;
        const anchorOffset = (anchorNode as any).wholeText.indexOf(query);
        const focusOffset = endQuery
          ? (focusNode as any).wholeText.indexOf(endQuery) + endQuery.length
          : anchorOffset + query.length;
        setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
      } else if (typeof query === "object") {
        const el = $el[0];
        const anchorNode = getTextNode(el.querySelector(query.anchorQuery));
        const anchorOffset = query.anchorOffset || 0;
        const focusNode = query.focusQuery
          ? getTextNode(el.querySelector(query.focusQuery))
          : anchorNode;
        const focusOffset = query.focusOffset || 0;
        setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
      }
    });
  }
);

function getTextNode(el: Node, match?: string) {
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  if (!match) {
    return walk.nextNode();
  }

  let node;
  while ((node = walk.nextNode())) {
    if ((node as any).wholeText.includes(match)) {
      return node;
    }
  }
}

function setBaseAndExtent(...args: any[]) {
  const document = args[0].ownerDocument;
  document.getSelection().removeAllRanges();
  document.getSelection().setBaseAndExtent(...args);
}

Cypress.Commands.add(
  "paste",
  { prevSubject: true },
  (selector, pastePayload) => {
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
    cy.wrap(selector).then(($destination) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData("text/plain", pastePayload);
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer,
      });
      $destination[0].dispatchEvent(pasteEvent);
    });
  }
);
