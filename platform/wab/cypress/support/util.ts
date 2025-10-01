/* eslint-disable no-restricted-syntax */
/*
 * Note about this module: we should use Cypress's custom commands when possible.
 */
import * as _ from "lodash";
import * as platform from "platform";
import { ACTIONS_META } from "../../src/wab/client/state-management/interactions-meta";
import { StudioCtx } from "../../src/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "../../src/wab/client/studio-ctx/view-ctx";
import { testIds } from "../../src/wab/client/test-helpers/test-ids";
import {
  updateVariableOperations,
  updateVariantOperations,
} from "../../src/wab/client/test-helpers/test-state-management";
import type {
  ApiDataSource,
  ApiUpdateDataSourceRequest,
  CreateProjectRequest,
  SetSiteInfoReq,
} from "../../src/wab/shared/ApiSchema";
import {
  ensureArray,
  ensureType,
  mkShortId,
  spawnWrapper,
  unexpected,
  withoutNils,
} from "../../src/wab/shared/common";
import {
  StateAccessType,
  StateVariableType,
} from "../../src/wab/shared/core/states";
import { DevFlagsType } from "../../src/wab/shared/devflags";
import { HostLessPackageInfo, State } from "../../src/wab/shared/model/classes";
import bundles from "../bundles";

// Attention: we ban cy.window, cy.document, cy.focused, Cypress.$.
//
// Also, do not use globals, at least in this module! See __plasmicTestGlobals
// below.

function assert<T>(cond: T): asserts cond {
  if (!cond) {
    debugger;
    throw new Error("Assertion failed");
  }
}

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    throw new Error(`Value must not be undefined or null.`);
  } else {
    return x;
  }
}

const PLATFORM = getPlatformName();

// Avoid module globals, since this is going to manifest in two separate
// variables across the support and integration modules produced by Cypress:
//
// https://github.com/cypress-io/cypress/issues/6966
//
// Just set everything on the window. Interestingly, that's exactly the official
// solution proposed above.
declare global {
  interface Window {
    __plasmicTestGlobals?: {
      _curWindow?: Window;
      _curDocument?: Document;
    };
  }
}
const globals = (window.__plasmicTestGlobals =
  window.__plasmicTestGlobals || {});

export function curWindow() {
  return globals._curWindow ? cy.wrap(globals._curWindow) : cy.window();
}

export function curDocument() {
  // Simply cy.wrap(_curDocument) results in Chainable<JQuery<Document>> rather than Chainable<Document>!
  return globals._curDocument
    ? cy.wrap(null).then(() => ensure(globals._curDocument))
    : cy.document();
}

export function curFocused() {
  return cy.curDocument().then((doc) => doc.activeElement);
}

export function blurFocused() {
  return cy.curDocument().then((doc) => doc.activeElement.blur());
}

export function curBody() {
  return cy.curDocument().then((doc) => doc.body);
}

export function withinTopFrame(func: () => void) {
  return cy
    .curWindow()
    .then((win: Window) =>
      cy.wrap(win.parent.parent.document.body).within(() => func())
    );
}

export function waitStudioLoaded() {
  return cy.get(".canvas-editor__scaler", { timeout: 120000 });
}

export function withinStudioIframe(
  func: () => void,
  opts?: { noWaitStudioLoaded?: boolean }
) {
  return (
    cy
      // Beware: Stripe injects iframes into the document.
      // Make sure you grab the right one
      .get("iframe.studio-frame", { timeout: 120000 })
      .should(($iframe) => expect($iframe.contents().find("iframe")).to.exist)
      .then({ timeout: 120000 }, ($iframe) =>
        cy.wrap($iframe.contents().find("iframe"))
      )
      .should(
        ($iframe) =>
          // We need to check in a single `should` that the body loaded. For more,
          // see
          // https://www.cypress.io/blog/2020/02/12/working-with-iframes-in-cypress/.
          expect($iframe.contents().find("body")).to.exist
      )
      .then({ timeout: 120000 }, ($iframe) => {
        const iframe = $iframe[0] as HTMLIFrameElement;
        const _origWindow = globals._curWindow;
        const _origDocument = globals._curDocument;
        globals._curWindow = ensure(iframe.contentWindow);
        globals._curDocument = ensure(iframe.contentDocument);

        // We can choose to return either document or body.
        //
        // Our tests use to do cy.get('body'), which would fail if we didn't
        // return document.
        //
        // However our tests also do cy.contains('...'), which would often return
        // <head> if any of the script or style tags in head contains the string.
        //
        // So we decide to return body, and then ban all cy.get('body'), using
        // instead cy.curBody().
        return cy
          .wrap($iframe.contents().find("body"))
          .within(() => {
            // Give the studio time to load.
            if (!opts?.noWaitStudioLoaded) {
              waitStudioLoaded();
            }
            return func();
          })
          .then(() => {
            globals._curWindow = _origWindow;
            globals._curDocument = _origDocument;
          });
      })
  );
}

export function setup(opts_?: { demoMode?: boolean }) {
  //
  // Log in.
  //
  const opts = opts_ || {};

  cy.visit("/");

  cy.get("input[name=email]").type("user2@example.com");
  cy.get("input[name=password]").type("!53kr3tz!");
  cy.get("button[type=submit]").click();

  cy.contains('a[href="/projects"]', "All projects");

  cy.contains("New project").click();
  cy.contains("Blank project").click({ waitForAnimations: false });
  withinStudioIframe(() => {
    cy.contains("This custom arena is empty.", { timeout: 30000 });
  });

  cy.url().then((url) => {
    const regexp = /\/projects\/([^/?]*)/;
    const projectId = url.match(regexp)![1];
    Cypress.env("projectId", projectId);
  });
  if (opts.demoMode) {
    cy.url().then((url) => {
      cy.visit(url, { qs: { demo: "true" } });
    });
  }
}

export function effectiveWindow() {
  cy.get("*").then(($el) => {
    return $el[0].ownerDocument.defaultView;
  });
}

export function effectiveDocument() {
  cy.get("*").then(($el) => $el[0].ownerDocument);
}

export function drawRectRelativeToElt(
  elt: HTMLElement,
  initOffsetX: number,
  initOffsetY: number,
  deltaX: number,
  deltaY: number
) {
  return cy.wrap(null).then(() => {
    const { left, top } = elt.getBoundingClientRect();
    const initX = left + initOffsetX;
    const initY = top + initOffsetY;
    return drawRect(initX, initY, deltaX, deltaY);
  });
}

export function plotAt(x: number, y: number) {
  cy.get(".FreestyleBox__guard")
    .should("exist")
    .then(($guard) => {
      const guard = $guard[0];
      const rect = guard.getBoundingClientRect();
      cy.get(".FreestyleBox__guard").click(-rect.left + x, -rect.top + y, {
        force: true,
      });
    });
}

// export function plotRelativeToElt(
//   elt: HTMLElement,
//   offsetX: number,
//   offsetY: number
// ) {
//   const { left, top } = elt.getBoundingClientRect();
//   const x = left + offsetX;
//   const y = top + offsetY;
//   cy.plotAt(x, y);
// }

/**
 * Wait for a new artboard frame to be appear, including the "scroll into view"
 * logic, and return a Framed component.
 *
 * Specifically, we first determine the number of artboards and the scroll
 * position before, then run the "before" commands to actually trigger new
 * artboard creation, then wait for the nth artboard to appear and for the
 * scroll position to update, then return the Framed.
 */
export function waitForNewFrame(
  before: () => void,
  opts?: { skipWaitInit: boolean }
) {
  waitStudioLoaded();
  return cy.get(".canvas-editor__canvas-clipper").then(() => {
    return curDocument().then((doc) => {
      const existingFrames =
        doc.querySelectorAll(
          ".canvas-editor__frames .canvas-editor__viewport[data-test-frame-uid]"
        ) ?? [];

      before();

      return cy
        .wait(4000)
        .get(
          ".canvas-editor__frames .canvas-editor__viewport[data-test-frame-uid]" +
            withoutNils(
              [...existingFrames.values()].map((e) =>
                e.getAttribute("data-test-frame-uid")
              )
            )
              .map((frameUid) => `:not([data-test-frame-uid="${frameUid}"])`)
              .join(""),
          {
            timeout: 60000,
          }
        )
        .then(($frame) => {
          const frame = $frame[0] as HTMLIFrameElement;
          const framed = new Framed(frame);

          // Not sure why waitInit is not working for changing branches.
          if (opts?.skipWaitInit) {
            return framed;
          }
          return framed.waitInit().then(() => framed);
        });
    });
  });
}

export function getFramedByName(name: string) {
  return cy.contains(".CanvasFrame__Label", name).then(($label) => {
    const $frame = $label
      .parent(".CanvasFrame__Container")
      .find(".canvas-editor__viewport[data-test-frame-uid]");
    assert($frame.length > 0);
    return new Framed($frame[0] as HTMLIFrameElement);
  });
}

export function getFramed() {
  return cy
    .curDocument()
    .get(".canvas-editor__viewport[data-test-frame-uid]", { timeout: 5000 })
    .then(($frame) => {
      console.log("FRAME", $frame?.[0]);
      const frame = $frame[0] as HTMLIFrameElement;
      const framed = new Framed(frame);
      return framed.waitInit().then(() => framed);
    });
}

export function switchArena(name: string) {
  return cy.waitForNewFrame(
    () => {
      cy.get(`[id="proj-nav-button"]`).click({ force: true });
      cy.get(`[data-test-id="nav-dropdown-clear-search"]`).click({
        force: true,
      });
      cy.get(`[data-test-id="nav-dropdown-search-input"]`).type(name);
      cy.contains(name).click({ force: true }).wait(1000);
    },
    { skipWaitInit: true }
  );
}

export function createNewFrame() {
  return waitForNewFrame(() => {
    cy.insertFromAddDrawer(`New scratch artboard`);
  });
}

export function createNewComponent(name: string) {
  return waitForNewFrame(() => {
    cy.insertFromAddDrawer(`New component`);
    submitPrompt(name);
  });
}

export function createNewPage(name: string) {
  return waitForNewFrame(() => {
    cy.insertFromAddDrawer(`New page`);
    submitPrompt(name);
  });
}

export function insertTextWithDynamic(code: string) {
  cy.insertFromAddDrawer("Text");
  cy.get(`[data-test-id="text-content"] label`).rightclick();
  cy.contains("Use dynamic value").click();
  cy.contains("Switch to Code").click();
  cy.resetMonacoEditorToCode(code);
}

export function createNewPageInOwnArena(
  name: string,
  { template, after }: { template?: string; after?: () => void } = {}
) {
  return waitForNewFrame(() => {
    // Create page
    cy.get("#proj-nav-button").click();
    cy.get("#nav-dropdown-plus-btn").click();
    cy.get(".ant-dropdown-menu-item").first().click();
    // Work around Cypress flaky input bug: https://github.com/cypress-io/cypress/issues/28172
    cy.get('[data-test-id="prompt"]:not([disabled])')
      .should("not.be.disabled")
      .clear({ force: true })
      .type(name, { force: true });
    if (template) {
      cy.contains(template).click();
    }
    cy.contains("Create page").click();

    after?.();
  });
}

export function turnOffDesignMode() {
  cy.get("#view-menu").click();
  cy.contains("Turn off design mode").click();
}

export function turnOffAutoOpenMode() {
  cy.get("#view-menu").click();
  cy.contains("Turn off auto-open mode").click();
}

export function turnOnAutoOpenMode() {
  cy.get("#view-menu").click();
  cy.contains("Turn on auto-open mode").click();
}

export function hideAutoOpen() {
  cy.autoOpenBanner()
    .parents(".banner-bottom")
    .find("button")
    .contains("Hide")
    .click();
}

export function refreshFocusedArena() {
  cy.get("#refresh-canvas-btn").click();
  cy.wait(1000);
}

export function submitPrompt(answer: string) {
  cy.get(`input[data-test-id="prompt"]`).type(answer);
  cy.get(`button[data-test-id="prompt-submit"]`).click();
}

export function linkNewProp(propName?: string, defaultValue?: string) {
  if (propName) {
    cy.get(`input[data-test-id="prop-name"]`).clear().type(propName);
  }
  if (defaultValue) {
    cy.get(`input[data-plasmic-prop="default-value"]`).type(defaultValue);
  }
  cy.get(`button[data-test-id="prop-submit"]`).click();
}

/**
 * Add a component prop to the current component.
 * defaultValue and previewValue only work for typeable values like "string" or "number"
 */
export function createComponentProp(opts: {
  propName: string;
  propType: string;
  defaultValue?: string;
  previewValue?: string;
}) {
  cy.switchToComponentDataTab();
  cy.get(`[data-test-id="add-prop-btn"]`).click();
  cy.selectPropOption(`[data-test-id="prop-type"]`, { key: opts.propType });
  cy.get(`[data-test-id="prop-name"]`).type(opts.propName);

  if (opts.defaultValue) {
    cy.get(`input[data-plasmic-prop="default-value"]`).type(opts.defaultValue);
  }

  if (opts.previewValue) {
    cy.get(`input[data-plasmic-prop="preview-value"]`).type(opts.previewValue);
  }

  cy.get(`button[data-test-id="prop-submit"]`).click();
  cy.wait(500);
}

export function openComponentPropModal(propName: string) {
  cy.switchToComponentDataTab();
  cy.contains(propName).rightclick();
  cy.contains("Configure prop").click();
}

export function setComponentPropDefaultValue(
  propName: string,
  defaultValue: string | undefined
) {
  cy.openComponentPropModal(propName);
  if (defaultValue !== undefined) {
    cy.get(`input[data-plasmic-prop="default-value"]`).type(
      "{selectall}{backspace}" + defaultValue
    );
  } else {
    cy.get(`button[data-test-id="default-value-menu-btn"]`).click();
    cy.contains("Unset").click();
  }
  cy.get(`button[data-test-id="prop-submit"]`).click();
  cy.wait(500);
}

export function setComponentPropPreviewValue(
  propName: string,
  previewValue: string | undefined
) {
  cy.openComponentPropModal(propName);
  if (previewValue !== undefined) {
    cy.get(`input[data-plasmic-prop="preview-value"]`).type(
      "{selectall}{backspace}" + previewValue
    );
  } else {
    cy.get(`button[data-test-id="preview-value-menu-btn"]`).click();
    cy.contains("Unset").click();
  }
  cy.get(`button[data-test-id="prop-submit"]`).click();
  cy.wait(500);
}

export function getTokensPanel() {
  return cy.get(`[data-test-id="tokens-panel-content"]`);
}

// NOTE: Importing TokenType from wab/commons causes the cypress runner to crash
type TokenType = "Color" | "FontSize";

export function createToken(tokenType: TokenType, name: string, value: string) {
  cy.switchToStyleTokensTab();
  cy.get(`[data-test-id="add-token-button-${tokenType}"]`).click({
    force: true,
  });
  // Wait for the sidebar modal to be visible
  cy.get("#sidebar-modal").should("exist");
  cy.justType(name);
  cy.get(
    `#sidebar-modal .panel-popup-content [data-test-id="${tokenType}-input"]`
  ).type(`${value}{enter}`);
  cy.closeSidebarModal();
}

export function changeTokensTarget(targetName: string) {
  cy.get(`[data-test-id="global-variant-select"]`).click();
  cy.get(`[data-plasmic-role="overlay"]`).contains(targetName).click();
}

export function updateToken(
  tokenType: TokenType,
  tokenName: string,
  value: string,
  opts: {
    globalVariant?: string;
    override?: boolean;
  } = {}
) {
  cy.switchToStyleTokensTab();
  cy.expandAllTokensPanel();
  const tokenRow = cy.getTokensPanel().contains(tokenName).eq(0);
  cy.changeTokensTarget(opts.globalVariant ?? "Base");
  if (opts.override) {
    tokenRow.rightclick();
    cy.get(`[role="menuitem"]`).contains("Override").click();
  } else {
    tokenRow.click();
  }
  cy.get("#sidebar-modal").should("exist");
  if (opts.override) {
    // Assert that the token name cannot be changed
    cy.get(".panel-popup-title input[readonly]").should("exist");
  }
  cy.get(
    `#sidebar-modal .panel-popup-content [data-test-id="${tokenType}-input"]`
  ).type(`${value}{enter}`);

  cy.closeSidebarModal();
}

export function getStudioModal() {
  return cy.get(".ant-modal-content");
}

export function deleteToken(tokenName: string) {
  cy.switchToStyleTokensTab();
  cy.expandAllTokensPanel();
  cy.getTokensPanel().contains(tokenName).eq(0).rightclick();
  cy.get(`[role="menuitem"]`).contains("Delete").click();
  cy.wait(200);
  cy.getStudioModal().find("button[type=submit]").click();
}

export function removeTokenOverride(
  tokenName: string,
  opts: { globalVariant?: string } = {}
) {
  cy.switchToStyleTokensTab();
  cy.expandAllTokensPanel();
  cy.changeTokensTarget(opts.globalVariant ?? "Base");
  cy.getTokensPanel().contains(tokenName).eq(0).rightclick();
  cy.get(`[role="menuitem"]`).contains("Remove").click();
}

export function assertTokenIndicator(
  tokenName: string,
  indicator:
    | "local"
    | "local-varianted"
    | "override-base"
    | "override-varianted"
    | "override-both"
    | "override-none",
  baseVariantName: "Base",
  globalVariantName?: string
) {
  function getElement() {
    return cy
      .getTokensPanel()
      .contains(tokenName)
      .eq(0)
      .parents("li")
      .find("[class*=DefinedIndicator]");
  }

  cy.switchToStyleTokensTab();
  cy.expandAllTokensPanel();
  switch (indicator) {
    case "local":
      changeTokensTarget(baseVariantName);
      getElement().should("not.exist");
      if (globalVariantName) {
        changeTokensTarget(globalVariantName);
        getElement()
          .invoke("attr", "class")
          .should("include", "DefinedIndicator--inherited");
      }
      break;
    case "local-varianted":
      changeTokensTarget(baseVariantName);
      getElement().should("not.exist");
      if (globalVariantName) {
        changeTokensTarget(globalVariantName);
        getElement()
          .invoke("attr", "class")
          .should("include", `DefinedIndicator--overriding`);
      }
      break;
    case "override-none":
      changeTokensTarget(baseVariantName);
      getElement()
        .invoke("attr", "class")
        .should("include", `DefinedIndicator--inherited`);
      if (globalVariantName) {
        changeTokensTarget(globalVariantName);
        getElement()
          .invoke("attr", "class")
          .should("include", `DefinedIndicator--inherited`);
      }
      break;
    case "override-base":
      changeTokensTarget(baseVariantName);
      getElement()
        .invoke("attr", "class")
        .should("include", `DefinedIndicator--set`);
      if (globalVariantName) {
        changeTokensTarget(globalVariantName);
        getElement()
          .invoke("attr", "class")
          .should("include", `DefinedIndicator--inherited`);
      }
      break;
    case "override-varianted":
      changeTokensTarget(baseVariantName);
      getElement()
        .invoke("attr", "class")
        .should("include", `DefinedIndicator--inherited`);
      if (globalVariantName) {
        changeTokensTarget(globalVariantName);
        getElement()
          .invoke("attr", "class")
          .should("include", `DefinedIndicator--overriding`);
      }
      break;
    case "override-both":
      changeTokensTarget(baseVariantName);
      getElement()
        .invoke("attr", "class")
        .should("include", `DefinedIndicator--set`);
      if (globalVariantName) {
        changeTokensTarget(globalVariantName);
        getElement()
          .invoke("attr", "class")
          .should("include", `DefinedIndicator--overriding`);
      }
      break;
  }
}

export function createNewEventHandler(
  eventName: string,
  args: { name: string; type: string }[]
) {
  cy.switchToComponentDataTab();
  cy.get(`[data-test-id="add-prop-btn"]`).click({ force: true });
  cy.get(`[data-test-id="prop-name"]`).type(eventName);
  cy.selectPropOption(`[data-test-id="prop-type"]`, { key: "eventHandler" });
  for (const arg of args) {
    cy.get(`[data-test-id="add-arg"]`).click();
    cy.get(`[data-test-id="arg-name"]`).last().type(arg.name);
    cy.get(`[data-test-id="arg-type"]`).last().click();
    cy.selectOption({ key: arg.type });
  }
  cy.get(`button[data-test-id="prop-submit"]`).click();
}

export function waitForSave() {
  cy.get("*[class^=PlasmicSaveIndicator]").should("not.exist");
}

export class Framed {
  constructor(private frame: HTMLIFrameElement) {}

  /**
   * If the ArenaFrame was removed and re-added, such as if we undo/redo or
   * switch arenas, then the old iframe reference we had will be detached and
   * we'll need to re-bind to a new iframe.  This utility is for re-binding.
   */
  rebind() {
    cy.get(`[data-test-frame-uid="${this.frame.dataset.testFrameUid}"]`).then(
      ($frame) => (this.frame = $frame[0] as HTMLIFrameElement)
    );
  }

  getFrame() {
    return this.frame;
  }

  base() {
    return cy
      .wrap(null)
      .then(() => ensure(ensure(this.frame.contentDocument).body));
  }

  doc() {
    return cy.wrap(null).then(() => ensure(this.frame.contentDocument));
  }

  rootElt() {
    return this.base().find(`.__wab_root > *:not(style)`);
  }

  enterIntoTplTextBlock(text: string) {
    let parent: JQuery<HTMLElement>;
    this.base()
      .find(".__wab_editing")
      .then((elem) => {
        parent = elem.parent();
        return elem;
      })
      .find('[contenteditable="true"]')
      .wait(500) // Needed to prevent losing some keystrokes, probably need a better solution.
      .type(`{selectall}${text}{esc}`, {
        delay: 100,
        // With browser scrolling, Cypress will scroll the element into view,
        // even if it's already in view. This would mess up free drawing tests.
        scrollBehavior: false,
      })
      .then(() => {
        this.base().find(".__wab_editing").should("not.exist");
        this.base()
          .find(
            // parent might have been detached
            parent
              .get()
              .map((elt) =>
                elt.className
                  .split(/\s/)
                  .map((cls) => `.${cls}`)
                  .join("")
              )
              .join(", ")
          )
          .contains(text);
        this.base().getSelectedTreeNode().click({
          force: true, // let's force it to click, even if it's hidden
        });
      });
  }

  type(text: string) {
    return this.focused().type(text, { force: true, delay: 80 });
  }

  waitContentEditable() {
    // I haven't been able to figure out why, but this wait is needed or else
    // the first entered keystrokes may be dropped.
    this.base()
      .find('[contenteditable="true"]', { timeout: 10000 })
      .should("have.class", "__wab_editing");
  }

  focused() {
    return this.doc().then((doc) => doc.activeElement);
  }

  plotTextAtSelectedElt(text: string) {
    cy.getSelectionBox().then(($elt) => {
      this.plotTextRelativeToElt($elt[0], 1, 1, text);
    });
  }

  waitInit() {
    // TODO This timeout does not do anything, but leaving here as a note in case you run into this (hopefully rare) timeout.  Issue is blocked on https://github.com/cypress-io/cypress/issues/5980.
    cy.wrap(null, { timeout: 9999 }).then(() =>
      waitCanvasOrPreviewIframeLoaded(this.frame)
    );

    // Wait for the full initial render eval cycle.
    this.base().find(".__wab_root").should("exist");
    return waitFrameEval(this);
  }

  plotText(x: number, y: number, text: string) {
    this.plotTextRelativeToElt(this.frame, x, y, text);
  }

  plotTextRelativeToElt(elt: HTMLElement, x: number, y: number, text: string) {
    const { left, top } = elt.getBoundingClientRect();
    cy.justType("t");
    cy.log(JSON.stringify({ left, top, x, y }));
    cy.plotAt(left + x, top + y);
    this.enterIntoTplTextBlock(text);
  }
}

export function justType(key: string) {
  if (!key) {
    return;
  }

  cy.wait(500);
  if (PLATFORM !== "osx") {
    key = key.replace(/cmd/g, "ctrl");
  }
  curDocument().then((doc) => {
    // cy.focused() fails if nothing is in focus, so we explicitly detect
    // this case and type into the body (which is where we listen to
    // shortcut key events)
    if (doc.activeElement === doc.body) {
      cy.wrap(doc.body).type(key, { force: true });
    } else {
      cy.curFocused().type(key, { force: true });
    }
  });
}

export function expectDebugTplTree(expected: string) {
  curWindow().should((win) => {
    const vc = (win as any).dbg.studioCtx.focusedViewCtx();
    const tree = vc.tplMgr().debugDumpTree(vc.tplRoot());
    expect(tree.trim()).to.equal(expected.trim());
  });
}

export function expectDebugTplTreeForFrame(index: number, expected: string) {
  curWindow().should((win) => {
    const vc = (win as any).dbg.studioCtx.viewCtxs[index];
    const tree = vc.tplMgr().debugDumpTree(vc.tplRoot());
    expect(tree.trim()).to.equal(expected.trim());
  });
}

export function focusFrame(framed: Framed) {
  focusFrameRoot(framed);
  justType("{shift}{enter}");
}

export function focusFrameRoot(framed: Framed) {
  framed.rootElt().click({ force: true });
  waitFocusedFrameEval();
  return cy.wrap(framed);
}

export function waitFocusedFrameEval() {
  return curWindow().then({ timeout: 30000 }, (win) => {
    return new Cypress.Promise((resolve: any) => {
      const vc = (win as any).dbg.studioCtx.focusedViewCtx() as ViewCtx;
      vc.awaitSync().then(() => resolve());
    });
  });
}

export function waitAllEval() {
  return curWindow().then({ timeout: 300000 }, (win) => {
    return new Cypress.Promise((resolve: any) => {
      (win as any).dbg.studioCtx.awaitEval().then(() => {
        resolve();
      });
    });
  });
}

export function waitLoadingComplete() {
  cy.wait(200);
  cy.get(".ScreenDimmer", { timeout: 10000 }).should("not.exist");
}

export function waitForFrameToLoad() {
  cy.wait(1000);
  cy.waitAllEval();
  cy.wait(2000);
  cy.switchToTreeTab();
  cy.get(".tpltree__root .tpltree__label", {
    timeout: 90000,
  }).should("exist");
}

export function waitFrameEval(framed: Framed) {
  return cy.curWindow().then({ timeout: 30000 }, (win) => {
    return new Cypress.Promise((resolve: any) => {
      const studioCtx = (win as any).dbg.studioCtx as StudioCtx;
      const vc = ensure(
        studioCtx.viewCtxs.find(
          (_vc: ViewCtx) => _vc.canvasCtx.viewport() === framed.getFrame()
        )
      );
      vc.awaitSync().then(() => resolve());
    });
  });
}

export function getSelectionTag() {
  return cy.get(".node-outline-tag");
}

export function renameSelectionTag(name: string) {
  getSelectionTag().dblclick();
  justType(name + "{enter}");
  getSelectionTag().should("contain", name);
}

export function extractComponentNamed(name: string) {
  justType("{cmd}{alt}k");
  cy.get(`input[data-test-id="extract-component-name"]`).type(name);
  cy.get(
    `form[data-test-id="extract-component-form"] button[type="submit"]`
  ).click();
}

export function getVariantFrame(index: number) {
  return cy
    .get(`.canvas-editor__frames .canvas-editor__viewport[data-test-frame-uid]`)
    .eq(index);
}

export function getBaseFrame() {
  return getVariantFrame(0);
}

export function selectRootNode() {
  cy.switchToTreeTab();
  return cy
    .get(`.tpltree__nodeLabel__summary`)
    .eq(0)
    .invoke("text")
    .then((text) => {
      selectTreeNode([text]);
    });
}

export function focusBaseFrame() {
  return getBaseFrame().then((frame) => {
    frame.click();
    return new Framed(frame[0] as HTMLIFrameElement);
  });
}

export function getSelectedElt() {
  cy.waitAllEval();
  return curWindow().then((win) => {
    const vc = (win as any).dbg.studioCtx.focusedViewCtx();
    return cy.wrap(vc.focusedDomElt());
  });
}

/**
 * Increasing this speeds up undo/redo, but we opt to keep it granular so we
 * ensure the exact same # redos is needed.
 */
const undosPerBatch = 1;
const maxUndos = 100;
/**
 * Keep undoing until no frames left, then redo that same number of times.
 */
export function undoAndRedo() {
  let undoBatches = 0;

  function undo() {
    curBody().then(($body) => {
      if (undoBatches * undosPerBatch > maxUndos) {
        throw new Error("Exceeded max undos.  App may be wedged.");
      }
      waitAllEval();
      const $frames = $body.find(
        ".canvas-editor__viewport[data-test-frame-uid]"
      );
      if ($frames.length > 0) {
        justType("{cmd}" + _.repeat("z", undosPerBatch));
        undoBatches++;
        undo();
      } else {
        redo();
      }
    });
  }

  function redo() {
    justType("{cmd}" + _.repeat("y", undoBatches * undosPerBatch));
  }

  undo();
}

/**
 * Performs an undo operation in the editor.
 * @param times - Number of times to perform the undo operation (default: 1)
 */
export function undoTimes(times = 1) {
  for (let i = 0; i < times; i++) {
    cy.waitAllEval();
    justType(`{cmd}z`);
  }
}

export function getFontInput() {
  cy.switchToDesignTab();
  return cy.get(
    `.canvas-editor__right-pane [data-test-id="font-family-selector"]`
  );
}

export function underlineText() {
  cy.switchToDesignTab();
  return cy
    .get(
      `.canvas-editor__right-pane [data-test-id="text-decoration-selector"] [class*="PlasmicStyleToggleButtonGroup"] button:first-child svg`
    )
    .click();
}

export function setVisible() {
  cy.get('[data-plasmic-prop="display-visible"]').click();
}

export function getVisibilityToggle(nodeName: string) {
  return (
    cy
      .getTreeNode([nodeName])
      // hover to show the eye icon
      .realHover()
      .find('[class*="tpltree__label__visibility"]')
  );
}

/**
 * Toggles the visibility of a node in the outline tab.
 * @param nodeName - The name of the node to toggle visibility for.
 */
export function toggleVisiblity(nodeName: string) {
  getVisibilityToggle(nodeName)
    // click the eye icon in the tpl tree node
    .click();
}

export function setDisplayNone() {
  cy.get('[data-plasmic-prop="display-not-visible"]').click();
}

export function setNotRendered() {
  cy.get('[data-plasmic-prop="display-visible"]').rightclick();
  cy.contains("Not rendered").click();
}

export function setDynamicVisibility(customCode: string) {
  cy.get('[data-plasmic-prop="display-visible"]').rightclick();
  cy.contains("Use dynamic value").click();
  cy.wait(500);
  cy.enterCustomCodeInDataPicker(customCode);
}

export function chooseFont(fontName: string) {
  getFontInput().click();

  // Antd 4.1.2 is buggy here; after selecting font, the virtual
  // scroller may throw an uncaught exception when reading
  // clientHeight :-/
  cy.on("uncaught:exception", () => false);

  justType(fontName + "{enter}");
  // de-focus typography select
  justType("{esc}");
}

export function getFontSizeInput() {
  return cy.get(`.canvas-editor__right-pane input[data-test-id="font-size"]`);
}

export function chooseFontSize(fontSize: string) {
  cy.switchToDesignTab();
  getFontSizeInput().eq(0).click().focus();
  justType(fontSize + "{enter}");
}

export function chooseColor(opts: { color?: string; tokenName?: string }) {
  cy.switchToDesignTab();
  cy.get(`.canvas-editor__right-pane [data-test-id='color-selector'] button`)
    .eq(0)
    .click()
    .focus();
  if (opts?.color) {
    justType(opts.color + "{enter}");
  } else if (opts?.tokenName) {
    cy.get(`input[placeholder="Search for token"]`).type(
      `${opts.tokenName}{enter}`
    );
  }
  cy.closeSidebarModal();
}

export function convertToSlot(slotName?: string) {
  getSelectedElt().rightclick({ force: true });
  cy.contains("Convert to a slot").click({ force: true });
  if (slotName) {
    cy.get(`[data-test-class="simple-text-box"]`).type(
      `{selectall}${slotName}`
    );
  }
}

export function getSelectedTreeNode() {
  cy.switchToTreeTab();
  return cy.get(".tpltree__label--focused");
}

export function clickSelectedTreeNodeContextMenu(name: string) {
  getSelectedTreeNode().rightclick({ force: true });
  cy.contains(name).click({ force: true });
}

export function checkSelectedPropNodeAs(type: "default" | "forked") {
  getSelectedTreeNode().rightclick({ force: true });
  if (type === "default") {
    cy.contains("Revert to").should("not.exist");
  } else {
    cy.contains("Revert to").should("exist");
  }
  getSelectedTreeNode().click({ force: true });
}

export function selectTreeNode(
  names: string[]
): Cypress.Chainable<JQuery<HTMLElement>> {
  return getTreeNode(names).click({ force: true });
}

export function getTreeNode(
  names: string[],
  parentId?: string
): Cypress.Chainable<JQuery<HTMLElement>> {
  if (names.length === 0) {
    unexpected();
  }

  switchToTreeTab();

  const [name, ...rest] = names;
  const labelSelector = !parentId
    ? ".tpltree__root .tpltree__label"
    : `.tpltree__root .tpltree__label[data-test-parent-id="${parentId}"]`;

  const getRoot = !parentId && name === "root";
  if (getRoot) {
    // The tpltree is virtualized, so scroll to the top to ensure the first element is the root.
    cy.get(".tpltree-scroller").scrollTo("top", { ensureScrollable: false });
    cy.wait(500); // virtual list needs a bit of time to rerender
  }

  return (
    getRoot ? cy.get(labelSelector).first() : cy.contains(labelSelector, name)
  ).then(($elt) => {
    const id = $elt.data("test-id");
    if (rest.length === 0) {
      // For whatever reason, the $elt may no longer be attached to the DOM,
      // so query the DOM again by its unique test id.
      return cy.get(`[data-test-id="${id}"]`);
    }
    const expander = $elt.find(
      `.tpltree__label__expander[data-state-isopen="false"]`
    );
    if (expander.length > 0) {
      cy.wrap(expander).click({ force: true });
      cy.wait(500); // virtual list needs a bit of time to rerender
    }
    console.log("Got tree node id", id);
    return getTreeNode(rest, id);
  });
}

export function dragTreeNode(from: string[], to: string[]) {
  // select to and from node so they are both revealed
  getTreeNode(to).then(($to) => {
    getTreeNode(from).then(($from) => {
      const fromDraggableId = $from
        .parent(".tpltree__draggable")
        .data("test-id");
      const { left, top } = $to.get()[0].getBoundingClientRect();
      const toDraggableId = $to.parent(".tpltree__draggable").data("test-id");
      cy.get(`[data-test-id="${fromDraggableId}"]`).trigger("mousedown");
      cy.get(`[data-test-id="${toDraggableId}"]`)
        .trigger("mousemove", { pageX: left + 1, pageY: top + 1 })
        .trigger("mouseover")
        .trigger("mouseup");
    });
  });
}

export function renameTreeNode(
  name: string,
  opts?: { programatically?: boolean }
) {
  if (opts?.programatically) {
    curWindow().then((win) => {
      const sc = (win as any).dbg.studioCtx;
      sc.changeUnsafe(() => {
        const vc = sc.focusedViewCtx();
        const item = vc?.focusedTpl() ?? vc?.focusedSelectable();
        if (vc && item) {
          vc.getViewOps().renameTpl(name, item);
        }
      });
    });
  } else {
    blurFocused(); // if an input were selected, cmd+r wouldn't work
    justType("{cmd}{r}");
    justType(`${name}{enter}`);
    getSelectedTreeNode().contains(name);
  }
}

export function getSelectionBox() {
  return cy.get(".hoverbox");
}

export function dragGalleryItemRelativeToElt(
  item: string,
  elt: HTMLElement,
  x: number,
  y: number
) {
  openAddDrawer();
  addDrawerItem(item).trigger("mousedown");
  curDocument()
    .trigger("mousemove", { pageX: 0, pageY: 0, clientX: 0, clientY: 0 })
    .then(() => {
      const { left, top } = elt.getBoundingClientRect();
      return cy
        .get(".drag-guard")
        .trigger("mousemove", {
          pageX: left + x,
          pageY: top + y,
        })
        .trigger("mouseup");
    });
}

export function openAddDrawer() {
  cy.get(`button[data-test-id="add-button"]`).wait(500).click({ force: true });
}

export function insertFromAddDrawer(itemName: string, displayName?: string) {
  openAddDrawer();
  addDrawerItem(itemName, displayName).wait(500).click();
}

export function addDrawer() {
  return cy.get(`[data-test-id="add-drawer"]`);
}

export function switchToImportsTab() {
  switchToLeftTab("imports");
}

export function switchToTreeTab() {
  switchToLeftTab("outline");
}

export function switchToStyleTokensTab() {
  switchToLeftTab("tokens");
}

export function switchToComponentsTab() {
  switchToLeftTab("components");
}

export function switchToVersionsTab() {
  switchToLeftTab("versions");
}

export function switchToProjectSettingsTab() {
  switchToLeftTab("settings");
}

export function switchToResponsivenessTab() {
  switchToLeftTab("responsiveness");
}

function switchToLeftTab(key: string) {
  curWindow().then((win) => ((win as any).dbg.studioCtx.leftTabKey = key));
}

export function clickIfExists(selector: string) {
  return curBody().then(($body) => {
    if ($body.find(selector).length > 0) {
      cy.get(selector).click();
    }
  });
}

export function switchToDesignTab() {
  clickIfExists(`button[data-test-tabkey="style"]`);
}

export function switchToSettingsTab() {
  // multiple for tour test
  cy.get(`button[data-test-tabkey="settings"]`).click({ multiple: true });
}

export function switchToComponentDataTab() {
  // multiple for tour test
  cy.get(`button[data-test-tabkey="component"]`).click({ multiple: true });
}

export function addImageBackground() {
  cy.contains("Background").click();
  cy.contains("Add image").trigger("mouseover");
  cy.get('svg[data-icon-name="BgImage"]').click();
}

export function changeImageBackgroundFromPlaceholder(url: string) {
  cy.get(`input[data-test-id="image-url-input"]`).click();
  justType(url + "{enter}");
  curBody().click();
}

export function setImageSource(url: string) {
  cy.get(`input[data-test-id="image-url-input"]`)
    .clear()
    .type(url + "{enter}");
  curBody().click();
}

export function changeTagType(tag: string) {
  cy.get(`[data-test-class="tpl-tag-select"] input`).type(`${tag}{enter}`, {
    force: true,
  });
}

export function clearNotifications() {
  cy.get(".ant-notification-notice-close").click();
}

export function checkNoErrors() {
  // Wait for final save (period is 2s).
  cy.wait(3000);
  cy.get(".ant-notification-notice-close").should("not.exist");
}

export function treeTab() {
  switchToTreeTab();
  return cy.get(".outline-tab");
}

export function openProjectPanel() {
  cy.get("#proj-nav-button").click();
}

export function expandAllProjectPanel() {
  cy.get(`[data-test-id="nav-dropdown-expand-all"]`).click();
}

export function expandAllTokensPanel() {
  cy.get(`[data-test-id="tokens-panel-expand-all"]`).click();
}

export function getProjectPanelContents() {
  return cy.get(testIds.projectPanel.selector);
}

export function projectPanel() {
  openProjectPanel();
  cy.wait(200);
  expandAllProjectPanel();
  cy.get(`[data-test-id="nav-dropdown-clear-search"]`).click({ force: true });
  cy.wait(200);
  return getProjectPanelContents();
}

export function getComponentsCount() {
  return getProjectPanelContents()
    .find(`[class*="sizeContainer"]`)
    .last()
    .invoke("text");
}

export function getArenasCount() {
  return getProjectPanelContents()
    .find(`[class*="sizeContainer"]`)
    .first()
    .invoke("text");
}

export function branchPanel() {
  cy.get("#branch-nav-button").click();
  cy.wait(500);
  return cy.get(testIds.projectPanel.selector);
}

export function styleTab() {
  return cy.get(".style-tab");
}

export function settingsTab() {
  switchToSettingsTab();
  return cy.get(".settings-panel");
}

export function variantsTab() {
  cy.switchToComponentDataTab();
  return cy.get(`[data-test-id="variants-tab"]`);
}

export function addVariantGroup(name: string) {
  componentPanel()
    .get(`[data-test-id="add-variant-group-button"] .ant-dropdown-trigger`)
    .click();
  cy.get(".ant-dropdown-menu").contains("single").click({ force: true });
  justType(`${name}{enter}`);
}

export function addVariantToGroup(groupName: string, variantName: string) {
  getVariantGroupWidget(groupName)
    .find(`[data-test-class="add-variant-button"]`)
    .click();
  justType(variantName + "{enter}");
}

export function addInteractionVariant(selector: string) {
  addVariantToGroup("Interaction Variants", selector);
  cy.get(`[data-test-id="variant-selector-button"]`).click();
}

export function addRegisteredVariantFromCanvas(variantName: string) {
  cy.get(`[aria-label="Add registered variant"]`).click();
  justType(variantName + "{enter}");
  cy.get(`[data-test-id="variant-selector-button"]`).click();
}

export function editRegisteredVariantFromCanvas(newVariantName: string) {
  cy.get(`[class*="variantsList"]`).rightclick();
  cy.contains("Change variant selectors").click();
  cy.justType(`{del}${newVariantName}{enter}`);
  cy.get(`[data-test-id="variant-selector-button"]`).click();
}

export function editRegisteredVariantFromVariantsTab(
  existingVariantName: string,
  newVariantName: string
) {
  cy.doVariantMenuCommand(false, existingVariantName, "Edit registered keys");
  cy.justType(`{del}${newVariantName}{enter}{enter}`);
}

export function addRegisteredVariantFromVariantsTab(variantName: string) {
  addVariantToGroup("Registered Variants", variantName);
  cy.get(`[data-test-id="variant-selector-button"]`).click();
}

export function selectVariant(
  groupName: string,
  variantName: string,
  isGlobal = false
) {
  cy.switchToComponentDataTab();
  getVariantRow(groupName, variantName, isGlobal)
    .trigger("pointerover")
    .within(($row) => {
      $row.trigger("pointerenter");
      cy.get(`[data-test-class="variant-record-button-start"]`).click();
    });
}

export function ensureGlobalVariantsPanelIsOpen() {
  return cy
    .get(testIds.globalVariantsHeader.selector)
    .find("[data-test-id='show-extra-content']")
    .then(($showExtraContent) => {
      const attrValue = $showExtraContent.attr("data-show-extra-content");
      if (attrValue === "false") {
        cy.get(testIds.globalVariantsHeader.selector).click();
      }
    });
}

export function createGlobalVariantGroup(
  groupName: string,
  variantName: string
) {
  componentPanel()
    .get(`[data-test-id="add-global-variant-group-button"]`)
    .click();
  justType(`${groupName}{enter}`);
  cy.wait(200);
  justType(`${variantName}{enter}`);
}

export function deselectVariant(
  groupName: string,
  variantName: string,
  isGlobal = false
) {
  getVariantRow(groupName, variantName, isGlobal)
    .trigger("pointerover")
    .within(() => {
      cy.get(`[data-test-class="variant-record-button-stop"]`).click();
    });
}

export function activateVariantFromGroup(
  groupName: string,
  variantName: string
) {
  getVariantRow(groupName, variantName)
    .trigger("pointerover")
    .within(($el) => {
      console.log(
        "GOT ELT",
        $el,
        $el.find(`[data-test-class="variant-pin-button-activate"]`)
      );
      $el.find(`[data-test-class="variant-pin-button-activate"]`).click();
    });
}

export function deactivateVariant(groupName: string, variantName: string) {
  getVariantRow(groupName, variantName)
    .trigger("pointerover")
    .within(() => {
      cy.get(`[data-test-class="variant-pin-button-deactivate"]`).click();
    });
}

export function resetVariants() {
  cy.get('[data-test-id="variants-bar-dropdown-trigger"]')
    .click()
    .wait(100)
    .justType("{enter}{esc}")
    .wait(200);
}

export function componentPanel() {
  cy.switchToComponentDataTab();
  return cy.get(
    `[data-test-id="component-panel"], [data-test-id="page-panel"]`
  );
}

export function expandComponentPanel() {
  return cy
    .get(
      `[data-test-id="component-panel"] > div > [data-test-id="show-extra-content"]`
    )
    .then(($el) => {
      console.log("$el", $el);
      if ($el.attr("data-show-extra-content") === "true") {
        console.log("Already expanded!");
        return;
      } else {
        console.log("Click it");
        cy.get(
          `[data-test-id="component-panel"] > div > [data-test-id="show-extra-content"]`
        ).click({ timeout: 30000 });
      }
    });
}

export function withinLiveMode(func: () => void) {
  enterLiveMode();
  const frame = getLoadedLiveFrame();
  frame.within(() => {
    cy.get(".plasmic_default__div", { timeout: 60000 }).should("exist");
    func();
  });
  exitLiveMode();
}

export function openArtboardSettings() {
  cy.get(`[data-test-id="artboard-config-button"]`).click({
    // With browser scrolling, Cypress will scroll the element into view,
    // even if it's already in view. This would mess up free drawing tests.
    scrollBehavior: "center",
    force: true,
  });
}

export function addElementVariant(pseudoSelector: string) {
  cy.get("[data-test-id='add-private-interaction-variant-button']")
    .click()
    .wait(200);
  justType(pseudoSelector + "{enter}");
}

export function stopRecordingElementVariant() {
  cy.get(
    `[data-test-id="private-style-variants-section"] [data-test-class="variant-record-button-stop"]`
  ).click();
}

export function deactivateElementVariant() {
  cy.get(
    `[data-test-id="private-style-variants-section"] [data-test-class="variant-pin-button-deactivate"]`
  ).click();
}

export function toggleElementVariants() {
  let isOpened = false;
  cy.document().then((doc) => {
    if (
      doc.querySelectorAll(`[data-test-id="private-style-variants-title"]`)
        .length > 0
    ) {
      isOpened = true;
    }
    return;
  });
  if (isOpened) {
    return;
  }
  cy.get(`[data-test-id="apply-menu"]`)
    .click()
    .wait(200)
    .get(".ant-dropdown-menu")
    .contains("Element variants")
    .click()
    .wait(200);
}

export function doVariantMenuCommand(
  privateVariant: boolean,
  variantName: string,
  menuCommand: string
) {
  if (privateVariant) {
    cy.switchToDesignTab();
  } else {
    cy.variantsTab();
  }

  const dataTestId = privateVariant
    ? "private-style-variants-section"
    : "variants-tab";

  cy.get(`[data-test-id="${dataTestId}"] [data-test-class="variant-row"]`)
    .contains(variantName)
    .rightclick();
  cy.get(".ant-dropdown-menu .ant-dropdown-menu-item")
    .filter(":visible")
    .contains(menuCommand)
    .click({ force: true });
}

export function doVariantGroupMenuCommand(groupName: string, menuItem: string) {
  cy.contains(groupName).rightclick();
  cy.get(".ant-dropdown-menu").contains(menuItem).click({ force: true });
}

/**
 * Resolves if the frame is already loaded or if the frame then loads the
 * expected page (specified by the src).
 *
 * See
 * https://stackoverflow.com/questions/17158932/how-to-detect-when-an-iframe-has-already-been-loaded
 * for some details.
 */
function waitCanvasOrPreviewIframeLoaded(
  iframe: HTMLIFrameElement
): Promise<void> {
  return new Promise(
    spawnWrapper(async (resolve: any) => {
      const checkReady = () => {
        const contentWindow = iframe.contentWindow;
        const contentDocument = iframe.contentDocument;
        if (
          contentWindow &&
          contentDocument &&
          contentDocument.readyState === "complete"
        ) {
          // Make sure this isn't just the about:blank page.
          if (contentDocument.querySelector("#plasmic-app.__wab_user-body")) {
            resolve();
          }
        }
      };
      checkReady();
      if (iframe.contentDocument) {
        iframe.contentDocument.addEventListener("readystatechange", () =>
          checkReady()
        );
      }
      iframe.addEventListener("load", () => {
        resolve();
      });
    })
  );
}

export function addDrawerItem(itemName: string, displayName?: string) {
  addDrawer().find("input").click();
  justType(itemName);
  return addDrawer()
    .get(`li[data-plasmic-add-item-name="${itemName ?? displayName}"]`)
    .eq(0);
}

function getGlobalVariantGroupWidget(groupName: string) {
  cy.switchToComponentDataTab();
  cy.ensureGlobalVariantsPanelIsOpen();
  return cy
    .get(testIds.globalVariantsHeader.selector)
    .contains(groupName)
    .parents(`[data-test-class="variants-section"]`);
}

function getVariantGroupWidget(groupName: string) {
  cy.switchToComponentDataTab();
  return cy
    .get(`[data-test-id="variants-tab"]`)
    .contains(groupName)
    .parents(`[data-test-class="variants-section"]`);
}

function getVariantRow(
  groupName: string,
  variantName: string,
  isGlobal = false
) {
  return isGlobal
    ? getGlobalVariantGroupWidget(groupName)
    : getVariantGroupWidget(groupName)
        .contains(variantName)
        .parents(`[data-test-class="variant-row"]`);
}

// function enterLiveMode() {
//   return cy.get(`[data-test-id="enter-live-mode-btn"]`).click();
// }

function exitLiveMode() {
  return cy.get(`[data-test-id="exit-live-mode-btn"]`).click();
}

function getLoadedLiveFrame() {
  return cy.get(`[data-test-id="live-frame"]`).then(($frame) => {
    const elt = $frame[0] as HTMLIFrameElement;
    return waitCanvasOrPreviewIframeLoaded(elt).then(() => {
      return ensure(elt.contentDocument).body;
    });
  });
}

// noinspection DuplicatedCode
function getPlatformName() {
  // Copied from https://github.com/avocode/react-shortcuts/blob/master/src/helpers.js
  let os = ensure(platform.os).family || "";
  os = os.toLowerCase().replace(/\s*/g, "");
  if (/\bwin/.test(os)) {
    return "windows";
  } else if (/darwin|osx/.test(os)) {
    return "osx";
  } else if (/linux|freebsd|sunos|ubuntu|debian|fedora|redhat|suse/.test(os)) {
    return "linux";
  } else {
    return "other";
  }
}

function createCoords(x: number, y: number) {
  return {
    clientX: x,
    clientY: y,
    pageX: x,
    pageY: y,
    screenX: x,
    screenY: y,
  };
}

function drawRect(
  initX: number,
  initY: number,
  deltaX: number,
  deltaY: number
) {
  cy.get(".FreestyleBox__guard")
    .should("exist")
    .trigger("mousedown", {
      force: true,
      which: 1,
      ...createCoords(initX, initY),
    })
    .trigger("mousemove", {
      force: true,
      ...createCoords(initX + deltaX, initY + deltaY),
    })
    .wait(300)
    .trigger("mouseup", {
      force: true,
      ...createCoords(initX + deltaX, initY + deltaY),
    });
}

export function enterLiveMode() {
  return cy
    .get(`[data-test-id="enter-live-mode-btn"]`)
    .click()
    .get(`[data-test-id="live-frame"]`)
    .its("0.contentDocument.body")
    .should("not.be.empty")
    .then(cy.wrap)
    .find("#plasmic-app", { timeout: 60000 });
}

export function getArenas() {
  return cy.get("[data-test-frame-uid]");
}

export function exitLiveMove() {
  return cy.get(`[data-test-id="exit-live-mode-btn"]`).click();
}

export function setupNewProject({
  skipVisit = false,
  devFlags = {},
  name,
  email = "user2@example.com",
  inviteOnly,
  skipTours = true,
}: {
  skipVisit?: boolean;
  devFlags?: Partial<DevFlagsType>;
  name?: string;
  email?: string;
  inviteOnly?: boolean;
  skipTours?: boolean;
} = {}): Cypress.Chainable<string> {
  return cy
    .login(email)
    .request({
      url: "/api/v1/projects",
      method: "POST",
      body: ensureType<CreateProjectRequest>({
        name: name ? `[cypress] ${name}` : undefined,
      }),
    })
    .its("body.project.id", { log: false })
    .then((projectId: string) => {
      cy.log({
        name: "Project",
        message: projectId,
      });
      Cypress.env("projectId", projectId);
    })
    .then(() => {
      const body: SetSiteInfoReq = {};
      if (inviteOnly !== undefined) {
        body.inviteOnly = inviteOnly;
      }
      if (Object.keys(body).length > 0) {
        return cy.request({
          url: `/api/v1/projects/${Cypress.env("projectId")}`,
          method: "PUT",
          body,
        });
      }
    })
    .then(() => {
      const projectId = Cypress.env("projectId");
      if (!skipVisit) {
        openProject({ projectId, devFlags });
        if (skipTours) {
          disableTours();
        }
        withinStudioIframe(() => {});
      }
      return cy.wrap(projectId);
    });
}

export function setupProjectWithHostlessPackages({
  hostLessPackagesInfo,
  devFlags,
}: {
  hostLessPackagesInfo:
    | (Partial<HostLessPackageInfo> & { name: string })
    | (Partial<HostLessPackageInfo> & { name: string })[];
  devFlags?: Partial<DevFlagsType>;
}): Cypress.Chainable<string> {
  return cy
    .login()
    .request({
      url: "/api/v1/projects/create-project-with-hostless-packages",
      method: "POST",
      log: false,
      body: {
        hostLessPackagesInfo: ensureArray(hostLessPackagesInfo).map(
          (info) =>
            new HostLessPackageInfo({
              name: info.name,
              npmPkg: ensureArray(info.npmPkg),
              deps: info.deps ? ensureArray(info.deps) : [],
              cssImport: info.cssImport ? ensureArray(info.cssImport) : [],
              registerCalls: [],
              minimumReactVersion: info.minimumReactVersion ?? null,
            })
        ),
      },
    })
    .its("body.project.id", { log: false })
    .then((projectId: string) => {
      Cypress.log({
        name: "Project",
        message: projectId,
      });
      openProject({ projectId, devFlags });
      withinStudioIframe(() => {});
      return cy.wrap(projectId);
    });
}

export function setupProjectFromTemplate(
  bundleName: string,
  opts?: {
    skipVisit?: boolean;
    keepProjectIdsAndNames?: boolean;
    dataSourceReplacement?:
      | {
          type: string;
        }
      | {
          fakeSourceId: string;
        };
    devFlags?: Partial<DevFlagsType>;
  }
) {
  return cy
    .login()
    .request({
      url: "/api/v1/projects/import",
      method: "POST",
      log: false,
      body: {
        data: JSON.stringify(bundles[bundleName]),
        keepProjectIdsAndNames: opts?.keepProjectIdsAndNames,
        migrationsStrict: true,
        dataSourceReplacement: opts?.dataSourceReplacement,
      },
    })
    .its("body.projectId", { log: false })
    .then((projectId: string) => {
      Cypress.log({
        name: "Project",
        message: projectId,
      });
      if (!opts?.skipVisit) {
        openProject({ projectId, devFlags: opts?.devFlags });
      }
      return cy.wrap(projectId);
    });
}

// Returns the hostless project ID
export function setupHostlessProject(props: {
  name: string;
  npmPkg: string;
}): Cypress.Chainable<string> {
  return cy
    .setupNewProject({
      name: props.name,
      devFlags: { setHostLessProject: true },
      email: "admin@admin.example.com",
    })
    .then((hostlessProjectId: string) => {
      cy.withinStudioIframe(() => {
        // Fill in modal
        cy.get(`[data-test-id="hostless-name"]`).type(props.name);
        cy.get(`[data-test-id="hostless-npm-pkg-plus"]`).click();
        cy.get(`[data-test-id="hostless-npm-pkg"]`).type(props.npmPkg);
        cy.get(`[data-test-id="hostless-prompt-submit"]`).click();

        // Check that a version has been published
        cy.switchToVersionsTab();
        cy.contains("0.0.1").should("be.visible");
        cy.checkNoErrors();
      });

      return cy.wrap(hostlessProjectId);
    });
}

export function openProject({
  projectId,
  appendPath = "",
  qs = {},
  devFlags = {},
}: {
  projectId: string;
  appendPath?: string;
  qs?: { [k: string]: string };
  devFlags?: Partial<DevFlagsType>;
}) {
  Cypress.env("projectId", projectId);
  cy.visit(`/projects/${projectId}${appendPath}`, {
    qs: { runningInCypress: true, ...qs, ...devFlags },
    timeout: 120000,
  });
}

export function removeCurrentProject(email = "user2@example.com") {
  const projectId = Cypress.env("projectId");
  if (projectId) {
    Cypress.env("projectId", undefined);
    return cy.login(email).request({
      url: `/api/v1/projects/${projectId}`,
      method: "DELETE",
    });
  }
}

export function deleteDataSourcesByName(name: string) {
  return cy
    .request({
      url: `/api/v1/data-source/sources`,
      method: "GET",
    })
    .its("body.dataSources")
    .then((sources: ApiDataSource[]) => {
      for (const source of sources) {
        if (source.name === name) {
          return cy.deleteDataSource(source.id);
        }
      }
    });
}

export function deleteDataSource(dsid: string) {
  return cy.request({
    url: `/api/v1/data-source/sources/${dsid}`,
    method: "DELETE",
  });
}

export function deleteDataSourceOfCurrentTest() {
  const dataSourceId = Cypress.env("dataSourceId");
  if (dataSourceId) {
    Cypress.env("dataSourceId", undefined);
    cy.deleteDataSource(dataSourceId);
  }
}

export function countItems(selector: string) {
  return curDocument().then((doc) => {
    return doc.querySelectorAll(selector).length;
  });
}

export function importProject(projectId: string) {
  cy.switchToImportsTab();
  const selector = ".SidebarSectionListItem";
  cy.countItems(selector).then((countBefore: number) => {
    cy.get(`[data-test-id="import-btn"]`).click();
    cy.justType(projectId + "{enter}");
    // Wait for the project to be imported
    cy.get(selector).should("have.length.gte", countBefore + 1);
  });
}

export function removeAllDependencies() {
  cy.switchToImportsTab();
  cy.get(`.SidebarSectionListItem`).each(($el) => {
    cy.wrap($el).rightclick();
    cy.contains("Remove imported project").click();
    cy.get(".ant-modal-content").find("button[type=submit]").click();
  });

  cy.get(`.SidebarSectionListItem`).should("not.exist");
}

export function updateAllImports() {
  cy.switchToImportsTab();
  cy.get(`[data-test-id="check-for-updates-btn"]`).click();
  cy.wait(1000);
  // Iterate over all elements and click each one
  cy.get(`.SidebarSectionListItem button svg`).each(($el) => {
    cy.wrap($el).click();
    cy.get(".ant-modal-content").find("button[type=submit]").click();
  });
  // Wait for the projects to be updated
  cy.get(`.SidebarSectionListItem button svg`).should("not.exist");
}

export function publishVersion(description: string) {
  cy.switchToVersionsTab();
  const selector =
    ".SidebarSectionListItem:not(#publishing-version-spinner-item)";
  cy.countItems(selector).then((countBefore: number) => {
    cy.contains("Publish project").click();
    cy.getStudioModal().find(`input`).eq(0).type(description);
    cy.getStudioModal().contains("Confirm").click();
    // Wait for the version to be published
    cy.wait(500);
    cy.get(selector).should("exist");
    cy.get(selector).should("have.length", countBefore + 1);
  });
  cy.switchToTreeTab();
}

export function previewVersion(version: string) {
  cy.switchToVersionsTab();
  cy.contains(version).click();
  cy.waitForFrameToLoad();
  cy.switchToTreeTab();
}

export function revertToVersion(version: string) {
  cy.switchToVersionsTab();
  cy.contains(version).rightclick();
  cy.contains("Revert to this version").click();
  cy.contains(/^Revert$/).click();
  cy.waitForFrameToLoad();
  cy.switchToTreeTab();
}

export function login(email = "user2@example.com", password = "!53kr3tz!") {
  cy.fetchCsrf()
    .request({
      url: "/api/v1/auth/login",
      method: "POST",
      body: { email, password },
      log: false,
    })
    .fetchCsrf();
  Cypress.log({
    name: "login",
    message: email,
  });
}

export function getApiToken() {
  return cy
    .fetchCsrf()
    .request({
      url: `/api/v1/settings/apitokens`,
      method: "GET",
    })
    .its("body.tokens")
    .then((tokens) => {
      if (tokens.length > 0) {
        console.log("Using existing token", tokens[0].token);
        return tokens[0].token;
      }
      return cy
        .request({
          url: `/api/v1/settings/apitokens`,
          method: "PUT",
        })
        .its("body.token.token")
        .then((token) => {
          console.log("Using new token", token);
          return token;
        });
    });
}

export function getUserEmailVerificationToken(email: string) {
  return cy
    .fetchCsrf()
    .request({
      url: `/api/v1/auth/getEmailVerificationToken`,
      method: "GET",
      body: {
        email,
      },
    })
    .its("body.token")
    .then((token) => token);
}

export function codegen() {
  return cy.location().then(({ pathname }) => {
    const projectId = pathname.split("/")[2];
    return cy.getApiToken().then((token) => {
      return cy
        .request({
          url: `/api/v1/projects/${projectId}/code/components`,
          method: "POST",
          headers: {
            "x-plasmic-api-user": "user2@example.com",
            "x-plasmic-api-token": token,
          },
        })
        .then((res) => {
          return res.body;
        });
    });
  });
}

export function logout() {
  cy.request({
    url: "/api/v1/auth/logout",
    method: "POST",
  });
}

// Modified from https://github.com/cypress-io/cypress/issues/726
// Allow us to specify default headers to `cy.requests`.
export const cyRequestDefaultOptions: Partial<Cypress.RequestOptions> = {};

export function fetchCsrf() {
  return cy
    .request({
      url: "/api/v1/auth/csrf",
      log: false,
    })
    .its("body.csrf", { log: false })
    .then((csrf: string) => {
      if (!cyRequestDefaultOptions.headers) {
        cyRequestDefaultOptions.headers = {};
      }
      Object.assign(cyRequestDefaultOptions.headers, { "X-CSRF-Token": csrf });
      return csrf;
    });
}

export function justLog(message: string) {
  Cypress.log({
    name: "JustLog",
    message: `✳️ ${message}`,
  });
}

export function deselect() {
  cy.justType("{esc}");
  cy.get(".hoverbox").should("not.exist");
}

//
// Working with the style tab
//
export function setSelectedDimStyle(prop: string, value: string) {
  cy.switchToDesignTab();
  cy.setDataPlasmicProp(prop, value);
}

export function setSelectedPosition(prop: "top" | "left", value: string) {
  cy.switchToDesignTab();
  cy.get(`[data-plasmic-pos-trigger="${prop}"]`).click();
  setDataPlasmicProp(prop, value);
}

export function addItemToArrayProp(
  prop: string,
  value: Record<string, any>,
  opts?: {
    backSidebarModal?: boolean;
  }
) {
  cy.get(`[data-test-id="${prop}-add-btn"]`).click();
  cy.wait(500);
  for (const key in value) {
    if (typeof value[key] === "object" && value[key].type === "select") {
      cy.setSelectByLabel(key, value[key].label);
    } else {
      cy.setDataPlasmicProp(key, value[key]);
    }
  }
  if (opts?.backSidebarModal) {
    cy.get(`[data-test-id="back-sidebar-modal"]`).click();
    cy.wait(1000);
  } else {
    cy.get(`[data-test-id="close-sidebar-modal"]`).click();
  }
}

export function addFormItem(prop: string, value: Record<string, any>) {
  cy.get(`[data-test-id="${prop}-add-btn"]`).click();
  cy.wait(500);
  for (const key in value) {
    if (key === "inputType") {
      cy.setSelectByLabel(key, value[key]);
    } else if (key === "options") {
      for (const option of value[key]) {
        cy.addItemToArrayProp(
          key,
          {
            label: option,
            value: option,
          },
          { backSidebarModal: true }
        );
      }
    } else {
      cy.setDataPlasmicProp(key, value[key]);
    }
  }
  cy.wait(500);
  cy.get(`[data-test-id="close-sidebar-modal"]`).click();
}

export function removeItemFromArrayProp(prop: string, index: number) {
  cy.get(`[data-test-id="${prop}-${index}-remove"]`).click();
  cy.wait(500);
}

export function setDataPlasmicProp(
  prop: string,
  value: string,
  opts?: {
    reset?: boolean;
    omitEnter?: boolean;
    codeEditor?: boolean;
    clickPosition?: "right";
  }
) {
  const editor = cy.get(`[data-plasmic-prop="${prop}"]`).last();
  if (opts?.clickPosition) {
    editor.click(opts.clickPosition);
  } else {
    editor.click();
  }
  if (opts?.codeEditor) {
    cy.get(".react-monaco-editor-container").click();
    if (opts?.reset) {
      cy.justType("{selectall}{selectall}{backspace}");
    }
    cy.curFocused().type(value, {
      parseSpecialCharSequences: false,
    });
    cy.get(`[data-test-id="save-code"]`).click().wait(200);
  } else {
    if (opts?.reset) {
      cy.justType("{selectall}{selectall}{backspace}");
    }
    cy.justType(value);
    if (!opts?.omitEnter) {
      // Newest ant can have a delay until they show the dropdown (for the page picker input), until which point typing enter actually inserts a newline instead of entering the text input and closing the dropdown.
      cy.wait(2000);
      cy.justType("{enter}");
    }
  }
}

export function chooseDataPlasmicProp(prop: string, value: string) {
  if (value.includes("'") || value.includes('"')) {
    throw new Error("chooseDataPlasmicProp does not yet handle quotes");
  }
  clickDataPlasmicProp(prop);
  return cy
    .get(`[data-plasmic-role="overlay"] [data-key="'${value}'"]`)
    .click();
}

export function chooseDataPlasmicPropByLabel(prop: string, label: string) {
  if (
    label.includes("'") ||
    label.includes('"') ||
    label.includes("(") ||
    label.includes(")")
  ) {
    throw new Error("chooseDataPlasmicPropByLabel does not yet handle quotes");
  }
  clickDataPlasmicProp(prop);
  return cy
    .get(`[data-plasmic-role="overlay"] [data-key]:contains(${label})`)
    .click();
}

export function clickDataPlasmicProp(prop: string) {
  getDataPlasmicProp(prop).click();
}

export function getDataPlasmicProp(prop: string) {
  return cy.get(`[data-plasmic-prop="${prop}"]`);
}

export function expandSection(sectionId: string) {
  cy.get(
    `[data-test-id="${sectionId}"] [data-test-id="show-extra-content"]`
  ).click({ timeout: 30000 });
}

export function selectDataPlasmicProp(
  prop: string,
  value: string | { key: string }
) {
  return selectPropOption(`[data-plasmic-prop="${prop}"]`, value);
}

export function selectPropOption(
  propSelector: string,
  value: string | { key: string }
) {
  cy.get(propSelector).click();
  cy.selectOption(value);
}

export function selectOption(value: string | { key: string }) {
  // This is the old code, which should work, but stopped working since upgrading react-aria.
  // Cypress is doing its job correctly, setting the value of the hidden select.
  // However, at some point, before our code (react-web) handles the event,
  // somehow the value is reset to the original value.
  //  cy.get("select").select(value, { force: true });
  if (typeof value === "string") {
    cy.contains(`[role=option] *`, value).parents("[role=option]").click();
  } else {
    cy.get(`[data-key="${value.key}"]`).click();
  }
}

export function pickIntegration(maybeName?: string) {
  const name = maybeName ?? Cypress.env("dataSourceId");
  if (!name) {
    return;
  }
  cy.get("#data-source-modal-pick-integration-btn").then(($el) => {
    if ($el.length > 0) {
      cy.wrap($el).click();
      cy.withinTopFrame(() => {
        cy.setSelectByValue("dataSource", name);
        cy.contains("Confirm").click();
      });
    } else {
      cy.selectDataPlasmicProp("dataSource", name);
    }
  });
}

export function multiSelectDataPlasmicProp(prop: string, values: string[]) {
  cy.get(`[data-plasmic-prop="${prop}"]`).click();

  // Remove existing values, if any
  Cypress.$(
    `[data-plasmic-prop="${prop}"] [data-test-id="multi-select-value"]`
  ).each(() => {
    cy.get(`[data-plasmic-prop="${prop}"]`).click().type("{backspace}");
  });

  // Add values
  for (const val of values) {
    cy.get(`[data-plasmic-prop="${prop}"]`).type(`${val}{enter}`);
  }
}

export function addHtmlAttribute(attr: string, value: string) {
  cy.get(`[data-test-id="add-html-attribute"]`).click();
  justType(`${attr}{enter}`);
  cy.setDataPlasmicProp(attr, value);
}

export function getTextFromId(id: string) {
  return cy
    .get(`[data-test-id="${id}"]`)
    .invoke("text")
    .then((text) => {
      Cypress.log({ name: "text", message: text });
      return text;
    });
}

export function closeDataPicker() {
  cy.get(`[data-test-id="data-picker"]`)
    .contains("button", "Cancel")
    .click()
    .wait(100);
}

export function resetMonacoEditorToCode(code: string) {
  cy.wait(1000);
  cy.get('[data-test-id="data-picker"] .react-monaco-editor-container').click();
  cy.justType("{cmd}a{backspace}");
  cy.curFocused().paste(code);
  cy.get(`[data-test-id="data-picker"]`)
    .contains("button", "Save")
    .wait(100)
    .click()
    .wait(100);
}

export function closeMonacoEditor() {
  // Monaco may show suggestion popups while typing.
  // These popups handle the Escape key, interfering with the outer Modal.
  // Ensure the suggestion popup is not visible before trying to close.
  cy.get(`.monaco-editor .suggest-widget`).should("not.be.visible");
  cy.justType(`{esc}`); // otherwise esc may close the popup instead of Monaco!
}

export function repeatOnCustomCode(code: string) {
  cy.get(`[data-test-id="btn-repeating-element-add"]`).click();
  cy.get(
    `[data-test-id="repeating-element-collection"] .code-editor-input`
  ).click();
  cy.ensureDataPickerInCustomCodeMode();
  cy.resetMonacoEditorToCode(code);
}

export function getPropEditorRow(prop: string) {
  return cy.contains('[data-test-id^="prop-editor-row-"]', prop);
}

export function removePropValue(prop: string) {
  cy.getPropEditorRow(prop).rightclick();
  cy.contains(`Remove ${prop} prop`).click();
}

export function propAddItem(prop: string) {
  cy.getPropEditorRow(prop).contains("Add item").click();
}

export function enterCustomCodeInDataPicker(code: string) {
  cy.ensureDataPickerInCustomCodeMode();
  cy.wait(500);
  cy.resetMonacoEditorToCode(code);
}

export function bindPlasmicPropToCustomCode(name: string, code: string) {
  cy.get(`[data-test-id="prop-editor-row-${name}"]`).rightclick();
  cy.contains("Use dynamic value").click();
  cy.wait(500);
  enterCustomCodeInDataPicker(code);
}

export function bindPlasmicPropToObjectPath(name: string, path: string[]) {
  cy.get(`[data-test-id="prop-editor-row-${name}"]`).rightclick();
  cy.contains("Use dynamic value").click();
  cy.wait(500);
  cy.selectPathInDataPicker(path);
  cy.wait(500);
}

export function bindTextContentToCustomCode(code: string) {
  cy.get(`[data-test-id="text-content"] label`).rightclick();
  cy.contains("Use dynamic value").click();
  cy.wait(500);
  cy.ensureDataPickerInCustomCodeMode();
  cy.wait(500);
  cy.resetMonacoEditorToCode(code);
}

export function bindTextContentToObjectPath(path: string[]) {
  cy.get(`[data-test-id="text-content"] label`).rightclick();
  cy.contains("Use dynamic value").click();
  cy.wait(500);
  cy.selectPathInDataPicker(path);
  cy.wait(500);
}

export function ensureDataPickerInCustomCodeMode() {
  return cy.get('[data-test-id="data-picker"]').then(($dataPicker) => {
    if ($dataPicker.text().includes("Switch to Code")) {
      return cy.contains("Switch to Code").click();
    }
  });
}

export function selectPathInDataPicker(path: string[], save: boolean = true) {
  path.forEach((val, index) => {
    cy.get(
      `[data-test-id="data-picker"] [data-test-id="${index}-${val}"]`
    ).click();
  });
  if (save) {
    cy.get('[data-test-id="data-picker"]').contains("Save").click().wait(200);
  }
}

function disableTours() {
  cy.window().then((win) => {
    win.localStorage.setItem("plasmic.tours.top-project-nav", "true");
  });
}

function switchRightTab(key: string) {
  clickIfExists(`button[data-test-tabkey="${key}"][aria-selected="false"]`);
}

export function switchToDataTab() {
  switchRightTab("component");
}

function switchToSettingsRightTab() {
  switchRightTab("settings");
}

export type StateType = Omit<
  State,
  "typeTag" | "uid" | "param" | "onChangeParam" | "tplNode" | "implicitState"
> & {
  accessType: StateAccessType;
  variableType: StateVariableType;
  name: string;
  onChangeParam?: string;
  initialValue: string | undefined;
  isInitValDynamicValue?: boolean;
};

export function changeStateAccessType(
  stateName: string,
  oldAccessType: StateAccessType,
  newAccessType: StateAccessType
) {
  switchToDataTab();
  cy.get(`[data-test-id="${stateName}"]`).click().wait(200);
  if (
    (oldAccessType === "private" || newAccessType === "private") &&
    (oldAccessType !== "private" || newAccessType !== "private")
  ) {
    cy.get('[data-test-id="allow-external-access"]')
      .click({ force: true })
      .wait(200);
  }
  cy.selectDataPlasmicProp("access-type", { key: newAccessType });
  cy.get(`[data-test-id="close-sidebar-modal"]`).click().wait(200);
}

export function checkNumberOfStatesInComponent(
  explicit: number,
  implicit: number
) {
  switchToDataTab();
  cy.get(`[data-test-type="variable-row"]`).should("have.length", explicit);
  if (!implicit) {
    cy.get(
      `[data-test-id="variables-section"] [data-test-id="show-extra-content"]`
    ).should("not.exist");
  } else {
    expandSection("variables-section");
    cy.get(`[data-test-type="implicit-variable-row"]`).should(
      "have.length",
      implicit
    );
  }
}

export function addState(state: StateType) {
  switchToDataTab();
  cy.get('[data-test-id="add-state-btn"]').click().wait(200);
  cy.get(`[data-plasmic-prop="variable-name"]`).click();
  cy.justType(`{selectAll}{backspace}${state.name}`).wait(200);
  cy.selectDataPlasmicProp("variable-type", { key: state.variableType });
  if (state.isInitValDynamicValue || state.initialValue == null) {
    cy.get(`[data-test-id="prop-editor-row-initial-value"]`).rightclick();
    cy.contains("Use dynamic value").click();
    cy.ensureDataPickerInCustomCodeMode();
    cy.resetMonacoEditorToCode(
      state.initialValue != null ? state.initialValue : "undefined"
    );
  } else {
    cy.setDataPlasmicProp("initial-value", state.initialValue, {
      reset: true,
      omitEnter: true,
      codeEditor: ["array", "object"].includes(state.variableType),
    });
  }
  if (state.accessType !== "private") {
    cy.get('label [data-test-id="allow-external-access"]')
      .parents("label")
      .click()
      .wait(200);
    cy.selectDataPlasmicProp("access-type", { key: state.accessType });
  }
  cy.get('[data-test-id="confirm"]').click().wait(200);
}

interface InteractionType {
  actionName: keyof typeof ACTIONS_META;
  isMultiVariant?: boolean;
  args: Record<string, string | string[] | Record<string, any>>;
  dynamicArgs?: Record<string, string>;
  mode?: "always" | "never" | "when";
  conditionalExpr?: string;
}

export function addInteraction(
  eventHandler: string,
  interactions: InteractionType | InteractionType[]
) {
  switchToSettingsRightTab();
  cy.wait(300);
  cy.get(`[data-test-id="add-interaction"]`).click().wait(200);
  justType(`${eventHandler}{enter}`);
  ensureArray(interactions).forEach((interaction, interactionIndex, list) => {
    cy.wait(500);
    cy.selectDataPlasmicProp("action-name", { key: interaction.actionName });
    for (const argName in interaction.args) {
      cy.wait(500);
      if (argName === "operation") {
        const argVal =
          interaction.actionName === "updateVariable"
            ? updateVariableOperations[
                interaction.args[
                  argName
                ] as keyof typeof updateVariableOperations
              ]
            : updateVariantOperations[
                interaction.args[
                  argName
                ] as keyof typeof updateVariantOperations
              ];
        cy.selectDataPlasmicProp(argName, { key: `${argVal}` });
      } else if (argName === "variable") {
        const argVal = interaction.args[argName] as string[];
        cy.get(`[data-plasmic-prop="${argName}"]`).click();
        cy.selectPathInDataPicker(argVal);
      } else if (["value", "customFunction"].includes(argName)) {
        if (interaction.actionName === "updateVariant") {
          if (interaction.isMultiVariant) {
            const argVal = interaction.args[argName] as string[];
            cy.multiSelectDataPlasmicProp(argName, argVal);
          } else {
            const argVal = interaction.args[argName] as string;
            cy.selectDataPlasmicProp(argName, argVal);
          }
        } else {
          const argVal = interaction.args[argName] as string;
          cy.get(`[data-plasmic-prop="${argName}"]`).click();
          cy.resetMonacoEditorToCode(argVal);
        }
      } else if (argName === "vgroup") {
        const argVal = interaction.args[argName] as string;
        cy.selectDataPlasmicProp(argName, argVal);
      } else if (argName === "args") {
        const argVal = interaction.args[argName] as Record<string, string>;
        for (const eventHandlerArg in argVal) {
          cy.get(`[data-plasmic-prop="${eventHandlerArg}"]`)
            .rightclick()
            .wait(300);
          cy.contains("Use dynamic value").click().wait(1000);
          cy.ensureDataPickerInCustomCodeMode();
          cy.resetMonacoEditorToCode(argVal[eventHandlerArg]);
        }
      } else if (argName === "dataSourceOp") {
        const dataSourceOpOptions = interaction.args[argName] as Record<
          string,
          any
        >;
        cy.clickDataPlasmicProp("data-source-open-modal-btn");
        cy.createDataSourceOperation(
          dataSourceOpOptions["integration"],
          dataSourceOpOptions["args"]
        );
      } else {
        const argVal = interaction.args[argName] as string;
        cy.setDataPlasmicProp(argName, argVal);
      }
    }
    for (const argName in interaction.dynamicArgs) {
      const argVal = interaction.dynamicArgs[argName];
      cy.get(`[data-plasmic-prop="${argName}"]`).rightclick().wait(300);
      cy.contains("Use dynamic value").click().wait(1000);
      cy.ensureDataPickerInCustomCodeMode();
      cy.resetMonacoEditorToCode(argVal);
    }
    if (interaction.mode) {
      cy.clickDataPlasmicProp(`mode-${interaction.mode}`);
      if (interaction.mode === "when") {
        cy.clickDataPlasmicProp(`conditional-expr`);
        cy.resetMonacoEditorToCode(interaction.conditionalExpr ?? "");
      }
    }
    if (interactionIndex + 1 < list.length) {
      cy.get(`[data-test-id="add-new-action"]`).click({ force: true });
    }
  });
  cy.get(`[data-test-id="close-sidebar-modal"]`).click().wait(200);
}

export function switchInteractiveMode() {
  cy.get(`[data-test-id="interactive-switch"]`).click({ force: true });
}

export function getDevFlags() {
  return cy
    .login("admin@admin.example.com")
    .request({
      url: "/api/v1/admin/devflags",
      method: "GET",
      log: false,
    })
    .then((resp) => JSON.parse(resp.body.data) as DevFlagsType);
}

export function upsertDevFlags(devFlags: Partial<DevFlagsType>) {
  return cy.login("admin@admin.example.com").request({
    url: "/api/v1/admin/devflags",
    method: "PUT",
    log: false,
    body: {
      data: JSON.stringify(devFlags),
    },
  });
}

export function createTutorialDb(type: string) {
  return cy
    .login("admin@admin.example.com")
    .request({
      url: "/api/v1/admin/create-tutorial-db",
      method: "POST",
      log: false,
      body: {
        type,
      },
    })
    .its("body.id", { log: false });
}

export function createTutorialDataSource(type: string, dsname: string) {
  cy.login()
    .request({
      url: "/api/v1/personal-workspace",
      method: "GET",
      log: false,
    })
    .its("body.workspace.id")
    .then((wsId) => {
      createTutorialDb(type).then((dbId) => {
        cy.createDataSource({
          source: "tutorialdb",
          name: dsname,
          workspaceId: wsId,
          credentials: {
            tutorialDbId: dbId,
          },
          settings: {
            type: TUTORIAL_DB_TYPE,
          },
        });
      });
    });
}

export function cloneProject(opts: {
  projectId: string;
  name?: string;
  workspaceId?: string;
}) {
  const { projectId, name, workspaceId } = opts;
  return cy
    .login()
    .request({
      url: `/api/v1/projects/${projectId}/clone`,
      method: "POST",
      log: false,
      body: {
        name,
        workspaceId,
      },
    })
    .its("body", { log: false });
}

export function deleteProjectAndRevisions(projectId: string) {
  return cy.login("admin@admin.example.com").request({
    url: `/api/v1/admin/delete-project-and-revisions`,
    method: "DELETE",
    body: {
      projectId,
    },
    log: false,
  });
}

export function createDataSource(
  dataSourceInfo: Partial<ApiUpdateDataSourceRequest> & {
    workspaceId?: string;
  }
) {
  return cy
    .login()
    .request({
      url: `/api/v1/data-source/sources`,
      method: "POST",
      log: false,
      body: dataSourceInfo,
    })
    .its("body.id", { log: false })
    .then((id: string) => {
      Cypress.env("dataSourceId", id);
    });
}

export function addComponentQuery() {
  cy.get("#data-queries-add-btn").click();
  cy.wait(200);
}

export function pickDataSource(name: string) {
  cy.get("#data-source-modal-pick-integration-btn").click();
  withinTopFrame(() => {
    setSelectByLabel("dataSource", name);
    // In this within(), for some reason, .contains() doesn't work.
    // It internally uses :cy-contains(), and for some reason it's just not matching the elements.
    // But these selectors continue to work.
    cy.get("button:contains(Confirm)").click();
  });
}

/**
 * This assumes the bottom modal is already focused
 * Must set args["operation"] for the Data Source operation and
 * args["resource"] for the Data Source table
 */
export function createDataSourceOperation(
  name: string,
  args: Record<
    string,
    { value: string; isDynamicValue?: boolean; inputType?: string; opts?: any }
  >
) {
  cy.wait(2000);
  cy.selectDataPlasmicProp("data-source-modal-pick-integration-btn", name);
  cy.selectDataPlasmicProp("data-source-modal-pick-operation-btn", {
    key: args["operation"].value,
  });
  if (args["resource"]) {
    cy.selectDataPlasmicProp(
      "data-source-modal-pick-resource-btn",
      args["resource"].value
    );
  }
  Object.entries(args)
    .filter(([key, _value]) => !["operation", "resource"].includes(key))
    .forEach(([key, value]) => {
      if (value.inputType) {
        cy.clickDataPlasmicProp(`${key}-${value.inputType}`);
      }
      if (value.isDynamicValue) {
        // Open data picker
        cy.setDataPlasmicProp(key, "{{}{{}");
        enterCustomCodeInDataPicker(value.value);
      } else {
        cy.setDataPlasmicProp(
          key,
          value.value,
          value.opts ? { ...value.opts } : undefined
        );
      }
    });
  cy.saveDataSourceModal();
}

export function saveDataSourceModal() {
  cy.get("#data-source-modal-save-btn").click({ force: true });
}

export function createFakeDataSource() {
  const fakeDataSourceName = `Fake Data Source ${mkShortId()}`;
  return cy.createDataSource({
    source: "fake",
    name: fakeDataSourceName,
  });
}

export function autoOpenBanner() {
  cy.get(".canvas-editor").contains("Auto-showing hidden element.");
}

export function pressPublishButton() {
  waitForSave();
  cy.get("#topbar-publish-btn").click();
}

export function closeSidebarModal() {
  // Multiple can exist, if you are in a nested sidebar modal.
  // First one is hidden but :visible doesn't work in filtering.
  // So just select the last.
  cy.get('#sidebar-modal [data-test-id="close-sidebar-modal"]').last().click();
}

export function showMoreInSidebarModal() {
  // Multiple can exist, if you are in a nested sidebar modal.
  // First one is hidden but :visible doesn't work in filtering.
  // So just select the last.
  cy.get('#object-prop-editor-modal [data-test-id="show-extra-content"]')
    .last()
    .click();
}

export const TUTORIAL_DB_TYPE = "northwind";

export function setSelectByLabel(selectName: string, label: string) {
  cy.effectiveWindow().then((w) => {
    // Use get as a query to let this be retryable
    cy.get("*").should(() => {
      expect(w.dbg.testControls?.[selectName]?.setByLabel(label)).not.to.be
        .undefined;
    });
  });
}

export function setSelectByValue(selectName: string, value: string) {
  cy.effectiveWindow().then((w) => {
    // Use get as a query to let this be retryable
    cy.get("*").should(() => {
      expect(w.dbg.testControls?.[selectName]?.setByValue(value)).not.to.be
        .undefined;
    });
  });
}

export function updateFormValuesLiveMode(newValues: {
  inputs?: Record<string, any>;
  selects?: Record<string, any>;
  radios?: Record<string, any>;
}) {
  const { inputs = {}, selects = {}, radios = {} } = newValues;
  for (const key in inputs) {
    cy.get("#plasmic-app div").find(`label[for="${key}"]`).type(inputs[key]);
  }
  for (const key in selects) {
    cy.get("#plasmic-app div")
      .find(`label[for="${key}"]`)
      .parent()
      .get(`.ant-select-selector`)
      .click()
      .get(".ant-select-item-option")
      .contains(selects[key])
      .click();
  }
  for (const key in radios) {
    cy.get("#plasmic-app div")
      .find(`label[for="${key}"]`)
      .parent()
      .get(".ant-radio-wrapper")
      .contains(radios[key])
      .prev()
      .find("input")
      .check();
  }
}

export interface ExpectedFormItem {
  label: string;
  name: string;
  type: string;
  value?: any;
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function checkFormValues(
  expectedFormItems: ExpectedFormItem[],
  root: () => Cypress.Chainable<JQuery<HTMLElement>>
) {
  for (const item of clone(expectedFormItems)) {
    if (item.type !== "Checkbox") {
      root().find(`label[for="${item.name}"]`).contains(item.label);
    }
    if (item.value) {
      if (item.type === "Text Area") {
        root()
          .find(`textarea[id="${item.name}"]`)
          .invoke("val")
          .should("have.string", item.value);
      } else if (item.type === "Select") {
        root()
          .find(`label[for="${item.name}"]`)
          .parent()
          .parent()
          .children()
          .eq(1)
          .should("have.text", item.value);
      } else if (item.type === "Checkbox") {
        root().find(`input[id="${item.name}"]`).should("be.checked");
      } else if (item.type === "Radio Group") {
        root().find(`input[value="${item.value}"]`).should("be.checked");
      } else if (item.type === "DatePicker") {
        root()
          .find(`input[value="${item.value.slice(0, 10)}"]`)
          .should("be.visible");
      } else {
        root()
          .find(`input[id="${item.name}"]`)
          .should("have.value", item.value);
      }
    }
  }
}

export function checkFormValuesInCanvas(
  expectedFormItems: ExpectedFormItem[],
  framed: Framed
) {
  checkFormValues(expectedFormItems, () => framed.rootElt());
}

export function checkFormValuesInLiveMode(
  expectedFormItems: ExpectedFormItem[]
) {
  checkFormValues(expectedFormItems, () => cy.get(`#plasmic-app div`));
}

export function getFormValue(expectedFormItems: ExpectedFormItem[]) {
  const values = Object.fromEntries(
    expectedFormItems
      .filter((formItem) => formItem.value != null)
      .map((formItem) => [formItem.name, formItem.value])
  );
  return JSON.stringify(values, Object.keys(values).sort());
}

/**
 * Set up custom app host for testing code components
 * @param page - the page to host
 */
export function configureProjectAppHost(page: string) {
  cy.wait(500);
  cy.get(`[data-test-id="project-menu-btn"]`).click({ force: true });
  cy.wait(500);
  cy.get(`[data-test-id="configure-project"]`).click({ force: true });
  cy.withinTopFrame(() => {
    const plasmicHost = `http://localhost:${
      Cypress.env("CUSTOM_HOST_PORT") || 3000
    }/${page}`;
    cy.get(`[data-test-id="host-url-input"]`).clear().type(plasmicHost);
    cy.contains("Confirm").click();
    cy.log(`Please make sure host-test package is running at ${plasmicHost}`);
    cy.wait(3000);
    cy.get(
      `iframe[src^="http://localhost:${
        Cypress.env("CUSTOM_HOST_PORT") || 3000
      }/${page}"]`,
      { timeout: 60000 }
    );
    cy.reload({ timeout: 120000 });
  });
}

/**
 * Delete selected element with comments
 */
export function deleteSelectionWithComments() {
  cy.getSelectedElt().rightclick({ force: true });
  cy.contains("Delete").click();
  cy.get(".ant-modal").should("exist");
  cy.get('[data-test-id="confirm"]').click();
  cy.get(".ant-modal").should("not.exist");
}

/**
 * Adds a new comment thread to the currently selected element
 */
export function addCommentToSelection(text: string) {
  cy.getSelectedElt().rightclick({ force: true });
  cy.contains("Add comment").click();
  cy.get("[data-test-id='comment-post-text-area']").type(text);
  cy.get("[data-test-id='comment-post-submit-button']").click();
}

/**
 * Opens the comment thread dialog for a specific thread
 */
export function openCommentThread(threadId: string) {
  cy.get(`[data-test-id='comment-marker-${threadId}']`).click();
}

/**
 * Closes the currently open comment thread dialog
 */
export function closeCommentThread() {
  cy.get("[data-test-id='thread-comment-dialog-close-btn']").click();
}

/**
 * Open comments tab
 */
export function openCommentTab() {
  cy.get("[data-test-id='top-comment-icon']").click();
  cy.get(".comments-tab").should("exist");
}

/**
 * Click comment thread in comments tab
 */
export function clickCommentPost(threadId: string) {
  cy.get(`[data-test-id='comment-post-${threadId}']`).click();
  cy.get(".comments-tab").should("exist");
}
