/// <reference types="@types/resize-observer-browser" />
import { ArenaFrame } from "@/wab/classes";
import { CodeFetchersRegistry } from "@/wab/client/code-fetchers";
import {
  CanvasFrameInfo,
  mkCanvas,
} from "@/wab/client/components/canvas/canvas-rendering";
import { SubDeps } from "@/wab/client/components/canvas/subdeps";
import {
  getCanvasPkgs,
  getReactWebBundle,
  getSortedHostLessPkgs,
} from "@/wab/client/components/studio/studio-bundles";
import * as domMod from "@/wab/client/dom";
import { NodeAndOffset } from "@/wab/client/dom";
import { scriptExec, upsertJQSelector } from "@/wab/client/dom-utils";
import { handleError, reportError } from "@/wab/client/ErrorNotifications";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import * as common from "@/wab/common";
import { ensure, ensureInstance } from "@/wab/common";
import { DEVFLAGS } from "@/wab/devflags";
import { Box } from "@/wab/geom";
import {
  getFrameHeight,
  isHeightAutoDerived,
  updateAutoDerivedFrameHeight,
} from "@/wab/shared/Arenas";
import {
  makeTokenRefResolver,
  usedHostLessPkgs,
} from "@/wab/shared/cached-selectors";
import { getBuiltinComponentRegistrations } from "@/wab/shared/code-components/builtin-code-components";
import { CodeComponentsRegistry } from "@/wab/shared/code-components/code-components";
import { CodeLibraryRegistration } from "@/wab/shared/register-library";
import { getPublicUrl } from "@/wab/urls";
import {
  ComponentRegistration,
  CustomFunctionRegistration,
} from "@plasmicapp/host";
import { FetcherRegistration } from "@plasmicapp/host/dist/fetcher";
import { notification } from "antd";
import $ from "jquery";
import L from "lodash";
import debounce from "lodash/debounce";
import { autorun, Lambda, observable, runInAction } from "mobx";
import React from "react";

declare const COMMITHASH: string;

let gCanvasCtxIndex = 0;

export class CanvasCtx {
  /**
   * Simply for debugging purposes - give each a CanvasCtx a number.
   */
  private _index = gCanvasCtxIndex++;
  private ccRegistry: CodeComponentsRegistry;
  private codeFetchersRegistry: CodeFetchersRegistry;

  _$viewport: /*TWZ*/ JQuery<HTMLIFrameElement>;
  _win: /*TWZ*/ typeof window;
  _$doc: /*TWZ*/ JQuery<HTMLDocument>;
  _controlStyleNode: HTMLStyleElement;
  _$html: /*TWZ*/ JQuery;
  _$head: /*TWZ*/ JQuery;
  _$userBody: /*TWZ*/ JQuery;
  _$body: JQuery;
  _keyAdjustment: null | ((key: string) => string);
  _name: string;

  Sub: SubDeps;

  private _resizeObserver: ResizeObserver;
  private _mutationObserver: MutationObserver;
  private disposals: Lambda[] = [];

  installedHostLessPkgs = observable.set<string>();
  private usedPkgsDispose: Lambda;
  private _hostLessPkgsLock = Promise.resolve();

  get hostLessPkgsLock() {
    return this._hostLessPkgsLock;
  }

  constructor({
    $viewport,
    name,
  }: {
    $viewport: JQuery<HTMLIFrameElement>;
    name: string;
  }) {
    this._$viewport = $viewport;
    this._name = name;
    this._keyAdjustment = null;
  }

  private _updatingCcRegistryCount = observable.box(0);
  set updatingCcRegistryCount(v: number) {
    this._updatingCcRegistryCount.set(v);
  }
  get updatingCcRegistryCount() {
    return this._updatingCcRegistryCount.get();
  }

  private async updateCcRegistry(pkgs: string[]) {
    const previousFetch = this._hostLessPkgsLock;
    this.updatingCcRegistryCount++;
    this._hostLessPkgsLock = new Promise(
      common.spawnWrapper(async (resolve: () => void) => {
        await previousFetch;
        const pkgsData = await getSortedHostLessPkgs(pkgs);
        runInAction(() => {
          // We run in action because `installedHostLessPkgs` is observable
          // so we want computed values to re-compute only after all packages
          // have been installed and the `ccRegistry` is cleared
          for (const [pkg, pkgModule] of pkgsData) {
            if (!this.installedHostLessPkgs.has(pkg)) {
              scriptExec(this._win, pkgModule);
              this.installedHostLessPkgs.add(pkg);
            }
          }
          // Clear the memoized map
          this.ccRegistry?.clear();
          this.updatingCcRegistryCount--;
        });
        resolve();
      })
    );
    await this._hostLessPkgsLock;
  }

  isUpdatingCcRegistry() {
    return this.updatingCcRegistryCount !== 0;
  }

  private updatePkgsList(pkgs: string[]) {
    if (pkgs.some((pkg) => !this.installedHostLessPkgs.has(pkg))) {
      common.spawn(this.updateCcRegistry(pkgs));
    }
  }

  setInteractiveMode(interactive: boolean) {
    if (interactive) {
      this._$html.addClass("__interactive_canvas");
      this._$html.removeClass("__non_interactive_canvas");
    } else {
      this._$html.addClass("__non_interactive_canvas");
      this._$html.removeClass("__interactive_canvas");
    }
  }

  async *initViewPort(
    $viewport: JQuery<HTMLIFrameElement>,
    arenaFrame: ArenaFrame,
    sc: StudioCtx
  ) {
    async function awaitOrLog(promise: Promise<any>, errorMsg: string) {
      let resolved = false;
      promise
        .then(() => (resolved = true))
        .catch((error) => reportError(error));
      setTimeout(() => {
        if (!resolved) {
          reportError(new Error(errorMsg));
        }
      }, 10000);
      return await promise;
    }

    this.installedHostLessPkgs.clear();
    this._$viewport = $viewport;
    this._win = ensure(
      $viewport.get(0).contentWindow as typeof window,
      "Failed to get contentWindow from canvas viewport"
    );
    this._win.addEventListener("error", (e: ErrorEvent) =>
      handleCanvasError(e.error)
    );
    this._win.addEventListener(
      "unhandledrejection",
      (e: PromiseRejectionEvent) => handleCanvasError(e.reason)
    );
    this.codeFetchersRegistry = new CodeFetchersRegistry(this._win);
    const doc = this._win.document;
    const $doc = (this._$doc = $(doc) as JQuery<HTMLDocument>);

    this._$html = $doc.find("html");
    this.setInteractiveMode(sc.isInteractiveMode);
    this._$head = this._$html.find("head");
    this._controlStyleNode = upsertJQSelector(
      "style#controlStyles",
      () => this._$head.append($("<style />").attr({ id: "controlStyles" })),
      this._$head
    )[0] as HTMLStyleElement;
    upsertJQSelector(
      `link[href='${getPublicUrl()}/static/styles/canvas/canvas.${COMMITHASH}.css']`,
      () =>
        this._$head.append(
          $("<link />").attr({
            rel: "stylesheet",
            type: "text/css",
            href: `${getPublicUrl()}/static/styles/canvas/canvas.${COMMITHASH}.css`,
          })
        ),
      this._$head
    );
    this._$body = this._$html.find("body").first();
    this._$body.append(
      $("<div />").attr({
        class: "__wab_canvas_overlay",
        "data-frame-uid": arenaFrame.uid,
      })
    );
    yield "user-body-wait";
    this._$userBody = await awaitOrLog(
      this.waitForUserBody(),
      "Couldn't get userBody"
    );
    // We reinsert things because some frameworks (Remix Hydrogen dev server) blow away the entire document.
    // We also do it earlier so that we can intercept clicks as much as possible, rather than waiting for __wab_user_body first.
    this._$head = this._$html.find("head");
    this._$body = this._$html.find("body").first();
    upsertJQSelector(
      `link[href='${getPublicUrl()}/static/styles/canvas/canvas.${COMMITHASH}.css']`,
      () =>
        this._$head.append(
          $("<link />").attr({
            rel: "stylesheet",
            type: "text/css",
            href: `${getPublicUrl()}/static/styles/canvas/canvas.${COMMITHASH}.css`,
          })
        ),
      this._$head
    );
    if (!this._$body.find(".__wab_canvas_overlay").length) {
      this._$body.append(
        $("<div />").attr({
          class: "__wab_canvas_overlay",
          "data-frame-uid": arenaFrame.uid,
        })
      );
    }
    yield "script-wait";
    scriptExec(
      this._win,
      await awaitOrLog(getCanvasPkgs(), "Couldn't get canvasPkgs.")
    );
    scriptExec(
      this._win,
      await awaitOrLog(getReactWebBundle(), "Couldn't get reactWebBundle.")
    );

    // Overwrite the default executePlasmicDataOp with a custom one for in-studio use
    (this._win as any).__PLASMIC_EXECUTE_DATA_OP = sc.executePlasmicDataOp;

    // Cache interaction information in studio
    (this._win as any).__PLASMIC_CACHE_$STEP_VALUE = sc.save$stepValue;
    (this._win as any).__PLASMIC_CACHE_EVENT_ARGS = sc.saveInteractionArgs;
    (this._win as any).__PLASMIC_MUTATE_DATA_OP =
      sc.refreshFetchedDataFromPlasmicQuery;
    (this._win as any).__PLASMIC_GET_ALL_CACHE_KEYS = sc.getAllDataOpCacheKeys;
    (this._win as any).__PLASMIC_STUDIO_PATH = sc.getCurrentPathName;
    if (this.usedPkgsDispose) {
      this.usedPkgsDispose();
    }
    this.usedPkgsDispose = autorun(() =>
      this.updatePkgsList(usedHostLessPkgs(sc.site))
    );
    yield "hostless-wait";
    await awaitOrLog(
      this.hostLessPkgsLock,
      "Couldn't acquire hostLessPkgsLock."
    );

    const hostWin = (DEVFLAGS.artboardEval ? this._win : window) as any;
    const hostVersion = hostWin.__Sub.hostVersion;
    this.Sub = {
      ...hostWin.__Sub,
      ...hostWin.__CanvasPkgs,
      reactWeb: (this._win as any).__PlasmicReactWebBundle,
      dataSources: !hostVersion
        ? undefined
        : (this._win as any).__PlasmicDataSourcesBundle,
      dataSourcesContext: (this._win as any).__PlasmicDataSourcesContextBundle,
    };

    this.ccRegistry = new CodeComponentsRegistry(
      this._win,
      getBuiltinComponentRegistrations(this.Sub)
    );

    // Keep track of the changeCounter during latest resize
    const MAX_RESIZES_WITHOUT_USER_EDIT = 16;
    let resizeObserverLastChangeCounter = sc._changeCounter;
    let resizeObserverResizeCounter = 0;
    const resizeObserverCallback = debounce(
      ([entry]: ResizeObserverEntry[]) => {
        if (isHeightAutoDerived(arenaFrame)) {
          const height = Math.round(entry.contentRect.height);
          const frameHeight = getFrameHeight(arenaFrame);
          if (height && height !== frameHeight) {
            // We need to resize, but we want to limit how many resizes
            // happen without user-edits (as measured by sc._changeCounter)
            if (resizeObserverLastChangeCounter !== sc._changeCounter) {
              // Reset the counter, a user edit has been made
              resizeObserverLastChangeCounter = sc._changeCounter;
              resizeObserverResizeCounter = 0;
            } else {
              // No user edits made, but we still need to resize
              resizeObserverResizeCounter++;
            }

            if (resizeObserverResizeCounter < MAX_RESIZES_WITHOUT_USER_EDIT) {
              window.requestAnimationFrame(() => {
                // Shouldn't trigger a model change here since we don't save the
                // auto-derived height in the bundle.
                updateAutoDerivedFrameHeight(arenaFrame, height);
              });
            } else if (
              resizeObserverResizeCounter === MAX_RESIZES_WITHOUT_USER_EDIT
            ) {
              // If no changes happened, and we resized a bunch of times anyway,
              // then there's probably a code component messing with our height (e.g. 100vh)
              // See https://app.shortcut.com/plasmic/story/23759/high-pri-infinitely-expanding-canvas-when-css-overflows-vertically
              notification.warn({
                message: `Incompatible height in ${sc
                  .tplMgr()
                  .describeArenaFrame(arenaFrame)}`,
                description:
                  "We've stopped auto-growing the height of this artboard. There may be a code component with incompatible height (e.g. 100vh, 110%, calc(100%+300px)), which will cause the artboard to grow forever. You can fix this by setting the height of the code component instance within the Studio, which will allow us to cap the height to device height in the artboard",
                duration: 0,
              });
            }
          }
        }
      },
      200,
      { maxWait: 500 }
    );

    common.spawn(
      this.waitForUserBody().then(($userBody) => {
        // If there's already a resizeObserver, it might be from another frame
        // so we just disconnect it to then reconnect to a diff dom element
        if (this._resizeObserver) {
          this._resizeObserver.disconnect();
        }

        this._resizeObserver = new ResizeObserver(resizeObserverCallback);
        this._resizeObserver.observe($userBody[0]);
      })
    );

    yield "done";
  }

  private async waitForUserBody(): Promise<JQuery<HTMLElement>> {
    const getBody = () => {
      // Some frameworks or dev servers (Remix Hydrogen on Oxygen local dev server) can end up blowing away the entire document, so _$html would be an old unmounted handle.
      this._$html = this._$doc.find("html");
      const $userBody = this._$html.find(".__wab_user-body").first();
      if ($userBody.length > 0) {
        return $userBody;
      }
      return undefined;
    };

    const $maybeUserBody = getBody();
    if ($maybeUserBody) {
      // Already there!
      return $maybeUserBody;
    }

    return new Promise((resolve) => {
      // We install a mutation observer to wait for when the wab is added.
      // Note that we may end up waiting for a long time, potentially forever,
      // because this iframe may be paused if it is invisible.
      const check = () => {
        const $userBody = getBody();
        if ($userBody) {
          // We found it!
          observer.disconnect();
          window.clearInterval(intervalId);
          resolve($userBody);
        }
      };

      const observer = (this._mutationObserver = new MutationObserver(() => {
        check();
      }));
      observer.observe(this._$body.get(0), {
        childList: true,
        subtree: true,
      });

      // Sometimes MutationObserver stops working in Chrome, so we fallback to
      // using window.setInterval as well :-/
      const intervalId = window.setInterval(() => {
        check();
      }, 500);
    });
  }

  getRegisteredCodeComponents(): ComponentRegistration[] {
    return this.ccRegistry.getRegisteredCodeComponents();
  }

  getRegisteredCodeComponentsMap() {
    return this.ccRegistry.getRegisteredCodeComponentsMap();
  }

  getRegisteredCodeComponentsAndContextsMap() {
    return this.ccRegistry.getRegisteredComponentsAndContextsMap();
  }

  getRegisteredCodeFetchers(): FetcherRegistration[] {
    return this.codeFetchersRegistry.getRegisteredCodeFetchers();
  }

  getRegisteredCodeFetchersMap() {
    return this.codeFetchersRegistry.getRegisteredCodeFetchersMap();
  }

  getRegisteredFunctions(): CustomFunctionRegistration[] {
    return this.ccRegistry.getRegisteredFunctions();
  }

  getRegisteredFunctionsMap() {
    return this.ccRegistry.getRegisteredFunctionsMap();
  }

  getRegisteredLibraries(): CodeLibraryRegistration[] {
    return this.ccRegistry.getRegisteredLibraries();
  }

  // We cannot evaluate it in constructor since by then, the tplRoot hasn't
  // been rendered yet.
  $eltForTplRoot() {
    return this.$wabRoot().children().first();
  }

  private $wabRoot() {
    return this._$userBody.children().first();
  }

  // These are elements that is not from the components in the canvas.
  $wabInternalElements() {
    return [this._$userBody, this.$wabRoot()];
  }

  $head() {
    return this._$head;
  }

  viewportOffset() {
    return this.viewportContainerOffset();
  }
  viewportContainerOffset() {
    const viewportContainer = this.viewportContainer();
    return {
      top: viewportContainer.offsetTop,
      left: viewportContainer.offsetLeft,
    };
  }
  // Get the bounding box of the frame, which includes everything in the
  // FrameContainer. Currently it includes the iframe and the frame label.
  contentAreaBB() {
    const viewportContainer = this.viewportContainer();
    let bb = Box.fromRect(viewportContainer.getBoundingClientRect());
    $(viewportContainer)
      .children()
      .each((index, elem) => {
        if (getComputedStyle(elem).position === "absolute") {
          bb = bb.merge(elem.getBoundingClientRect());
        }
      });
    return bb.rect();
  }
  viewportContainer() {
    return ensure(
      this.viewport().parentElement,
      "Failed to get parentElement from viewport"
    );
  }
  viewport() {
    return ensureInstance(this.$viewport()[0], HTMLIFrameElement);
  }
  $viewport() {
    return this._$viewport;
  }
  win() {
    return this._win;
  }
  $doc() {
    return this._$doc;
  }
  doc(): HTMLDocument {
    return this.$doc().get(0) as any as HTMLDocument;
  }
  $body() {
    return this._$body;
  }
  // This is the actual div representing the page body.
  $userBody() {
    return this._$userBody;
  }
  // This is body's parent, and also contains modals/popups, where event
  // listeners, selection logic, etc. should still work.
  $html() {
    return this._$html;
  }
  controlStyleSheet() {
    return this._controlStyleNode.sheet as CSSStyleSheet;
  }
  getRange(..._args) {
    return domMod.range(this.doc());
  }
  setRange(start?: NodeAndOffset, end?: NodeAndOffset) {
    return domMod.range(this.doc(), start, end);
  }
  clearRange(..._args) {
    return domMod.clearRange(this.doc());
  }
  setKeyAdjustment(_keyAdjustment) {
    this._keyAdjustment = _keyAdjustment;
  }

  refreshFetchedDataFromPlasmicQuery(invalidateKey?: string) {
    const maybeExistingMutateAllKeysFn = (this._win as any).__SWRMutateAllKeys;
    if (typeof maybeExistingMutateAllKeysFn === "function") {
      maybeExistingMutateAllKeysFn(invalidateKey);
    }
  }

  private _outlineModeRules: CSSRule[] = [];
  setOutlineMode(mode: boolean) {
    const ss = this.controlStyleSheet();
    if (mode) {
      this._outlineModeRules = [];
      const addRule = (ruleText: string) => {
        // sessionstack.js intercepts the insertRule method such that it
        // suppresses the return value. So we use explicit index here.
        ss.insertRule(ruleText, 0);
        this._outlineModeRules.push(ss.cssRules[0]);
      };
      // Draw outline for all "real" boxes, which are all the tags we create
      addRule(`
        .__wab_tag, .__wab_instance, .__wab_text {
          outline: 1px dotted rgba(0, 0, 255, .5) !important;
          outline-offset: 1px !important;
          -webkit-text-stroke: 1px #aaa !important;
          -webkit-text-fill-color: white !important;
          opacity: 1 !important;
        }
      `);

      // Hide box-shadow and border for all elements, including ones that don't
      // correspond to a ValTag (for example, inside foreign components)
      addRule(`
        * {
          box-shadow: none !important;
          border: none !important;
          background: none !important;
        }
      `);

      // Hide placeholders (but keep their size)
      addRule(`
        .__wab_placeholder {
          visibility: hidden;
        }
      `);
      addRule(`
        .__wab_flex-item {
          opacity: 1 !important;
        }
      `);
    } else {
      for (const rule of this._outlineModeRules) {
        const index = L.indexOf(ss.cssRules, rule);
        ss.deleteRule(index);
      }
      this._outlineModeRules = [];
    }
  }
  isOutlineMode() {
    return this._outlineModeRules.length > 0;
  }

  private bridgeDispose: () => void | undefined;
  rerender(children: React.ReactNode, viewCtx: ViewCtx) {
    const frame = viewCtx.arenaFrame();

    const makeFrameInfo = (): CanvasFrameInfo => ({
      viewMode: frame.viewMode as CanvasFrameInfo["viewMode"],
      height: frame.height,
      isHeightAutoDerived: isHeightAutoDerived(frame),
      bgColor: frame.bgColor
        ? makeTokenRefResolver(viewCtx.site)(frame.bgColor) ?? frame.bgColor
        : undefined,
    });

    const frameInfo = observable.box<CanvasFrameInfo>(makeFrameInfo());
    if (this.bridgeDispose) {
      this.bridgeDispose();
    }
    // Set up a reaction that reacts to changes in top-level frame object
    // and copies it into sub observable
    this.bridgeDispose = autorun(
      () => {
        frameInfo.set(makeFrameInfo());
      },
      { name: "autorun(CanvasCtx.frameInfo)" }
    );

    const r = this.Sub.React.createElement;

    const node = r(
      mkCanvas(this.Sub, viewCtx),
      {
        frameInfo,
      },
      children
    );

    let wrapped: React.ReactElement = node;

    if (this.Sub.StudioFetcherContext) {
      wrapped = r(
        this.Sub.StudioFetcherContext.Provider,
        {
          value: {
            fetchJson: async (url: string) =>
              viewCtx.appCtx.api.queryDataSource(url),
          },
        },
        node
      );
    }

    this.Sub.setPlasmicRootNode(wrapped);
  }
  dispose() {
    this._resizeObserver?.disconnect();
    if (this.bridgeDispose) {
      this.bridgeDispose();
    }
    if (this.usedPkgsDispose) {
      this.usedPkgsDispose();
    }
    for (const dispose of this.disposals) {
      dispose();
    }
    this._mutationObserver?.disconnect();
  }
}

function handleCanvasError(err: any) {
  if (err) {
    // Check if the error was created in Studio iframe
    let proto = err;
    let studioIframeProto: any = Object;
    while (Object.getPrototypeOf(proto) != null) {
      proto = Object.getPrototypeOf(proto);
    }
    while (Object.getPrototypeOf(studioIframeProto) != null) {
      studioIframeProto = Object.getPrototypeOf(studioIframeProto);
    }
    if (proto === studioIframeProto) {
      // If so, handle the error
      handleError(err);
    }
  }
}
