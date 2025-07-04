import {
  SEARCH_PARAM_BRANCH,
  mkProjectLocation,
  parseProjectLocation,
  parseRoute,
} from "@/wab/client/cli-routes";
import { showCanvasPageNavigationNotification } from "@/wab/client/components/canvas/studio-canvas-util";
import { ClientPinManager } from "@/wab/client/components/variants/ClientPinManager";
import { HostFrameCtx } from "@/wab/client/frame-ctx/host-frame-ctx";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { withProvider } from "@/wab/commons/components/ContextUtil";
import { MainBranchId, ProjectId } from "@/wab/shared/ApiSchema";
import { getFrameHeight } from "@/wab/shared/Arenas";
import { FramePinManager } from "@/wab/shared/PinManager";
import {
  VariantCombo,
  getReferencedVariantGroups,
  isGlobalVariant,
  isScreenVariant,
} from "@/wab/shared/Variants";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  ensure,
  hackyCast,
  spawn,
  spawnWrapper,
  tuple,
} from "@/wab/shared/common";
import {
  allComponentNonStyleVariants,
  allComponentVariants,
} from "@/wab/shared/core/components";
import { allGlobalVariants } from "@/wab/shared/core/sites";
import { Component, Variant } from "@/wab/shared/model/classes";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { Route, fillRoute } from "@/wab/shared/route/route";
import {
  getMatchingPagePathParams,
  substituteUrlParams,
} from "@/wab/shared/utils/url-utils";
import * as Sentry from "@sentry/browser";
import { notification } from "antd";
import { Location, LocationDescriptorObject } from "history";
import _ from "lodash";
import * as mobx from "mobx";
import { makeObservable, observable } from "mobx";
import React from "react";

const DEFAULT_VIEWPORT_WIDTH = 320;
const DEFAULT_VIEWPORT_HEIGHT = 480;

/** All the input data required to make a preview route. */
interface PreviewInputData {
  full: boolean;
  /**
   * Can be either:
   * 1) a valid component and page params, or
   * 2) an invalid component, represented by a raw string
   *    (this happens when a user types a bad URL or clicks a bad link)
   */
  componentPath:
    | {
        /** Component/page. */
        component: Component;
        /** Page params that will be substituted into the page's path, e.g. { id: 123 } for "my-page/123" */
        pageParams?: Record<string, string>;
      }
    | string;
  /** Query params in the URL, e.g. { q: foo } for "my-page?q=foo" */
  pageQuery: Record<string, string>;
  /** Hash in the URL, e.g. #bar for "my-page#bar" */
  pageHash: string;
  allVariants: VariantCombo;
  width: number;
  height: number;
  branchName: string | null;
}

/** Preview input data plus extra output data, parsed from the route. */
interface PreviewDataOutput extends PreviewInputData {
  /** Everything after https://studio.plasmic.app/projects/123/preview/, e.g. "my-page?foo=bar#baz" */
  previewPath: string;
  variants: Record<string, string | string[]>;
  global: Record<string, string | string[]>;
}

export class PreviewCtx {
  private disposals: (() => void)[] = [];

  previewData: PreviewDataOutput | undefined = undefined;
  private previousLocation: Location | undefined = undefined;

  get previewPath() {
    return this.previewData?.previewPath || "";
  }
  get component() {
    if (
      !this.previewData ||
      typeof this.previewData.componentPath === "string"
    ) {
      return undefined;
    } else {
      return this.previewData.componentPath.component;
    }
  }
  get pageParams() {
    if (
      !this.previewData ||
      typeof this.previewData.componentPath === "string"
    ) {
      return undefined;
    } else {
      return this.previewData.componentPath.pageParams;
    }
  }
  get pageQuery() {
    return this.previewData?.pageQuery || {};
  }
  get pageHash() {
    return this.previewData?.pageHash || "";
  }
  get variants() {
    return this.previewData?.variants || {};
  }
  get global() {
    return this.previewData?.global || {};
  }

  // Viewport settings.
  get width() {
    return this.previewData?.width || DEFAULT_VIEWPORT_WIDTH;
  }
  get height() {
    return this.previewData?.height || DEFAULT_VIEWPORT_HEIGHT;
  }
  get full() {
    return this.previewData?.full || false;
  }

  /**
   * True if current window is a preview URl.
   * Note this is false if a preview popup is showing.
   */
  isLive = false;
  popup: Window | undefined = undefined;

  constructor(public hostFrameCtx: HostFrameCtx, public studioCtx: StudioCtx) {
    makeObservable(this, {
      previewData: observable,
      isLive: observable,
      popup: observable,
    });
    studioCtx.previewCtx = this;

    // Add history listener
    const historyListener = (location: Location) => {
      const wasLive = this.isLive;
      this.isLive = isLiveMode(location.pathname);
      if (!this.isLive && wasLive) {
        this.previousLocation = undefined;
      }
      spawn(this.parseRoute());
    };
    const disposeHistoryListener = hostFrameCtx.history.listen(historyListener);
    this.disposals.push(disposeHistoryListener);

    // Trigger initial history listener
    historyListener(hostFrameCtx.history.location);

    // This reaction is only for the popup live window.
    // It updates the popup to reflect the current component and variant settings in the editor.
    this.disposals.push(
      mobx.reaction(
        async () => {
          if (!this.popup) {
            return undefined;
          }

          const viewCtx = studioCtx.focusedViewCtx();
          if (!viewCtx) {
            return undefined;
          }

          const pinManager = new FramePinManager(
            viewCtx.site,
            viewCtx.arenaFrame()
          );

          // For async reactions, make sure to reference all observables before the first await.

          // We may have a popup, but it may not have fully loaded yet (i.e. popup URL is not live mode).
          // Skip this reaction in this case.
          const location = await this.getLocation();
          if (!isLiveMode(location.pathname)) {
            return undefined;
          }
          return {
            viewCtx,
            activeVariants: pinManager.activeNonBaseVariants(),
          };
        },
        (promise) =>
          spawnWrapper(async () => {
            const res = await promise;
            if (res) {
              const { viewCtx, activeVariants } = res;
              spawn(this.pushComponent(viewCtx.component, activeVariants));
            }
          })()
      )
    );

    const match = parseProjectLocation(this.studioCtx.appCtx.history.location);
    if (match && match.isPreview) {
      // If we started from live mode, go back to the same component when
      // navigating to dev mode.
      this.previousLocation = {
        ...this.studioCtx.appCtx.history.location,
        ...mkProjectLocation({
          ...match,
        }),
      };
    }
  }

  dispose() {
    this.disposals.forEach((d) => d());
  }

  async toggleLiveMode() {
    if (this.isLive) {
      this._stopLiveMode();
    } else {
      if (this.popup) {
        notification.error({
          message: "External preview window is already open.",
        });
      } else {
        await this._startLiveMode();
      }
    }
  }

  stopLiveMode() {
    if (this.isLive) {
      this._stopLiveMode();
    }
  }

  private async _startLiveMode() {
    const history = this.studioCtx.appCtx.history;

    this.previousLocation = history.location;

    const location = await getUrlsForLiveMode(this.studioCtx, false);
    history.push(location);
  }

  private _stopLiveMode() {
    const history = this.studioCtx.appCtx.history;

    history.push(
      this.previousLocation ||
        fillRoute(APP_ROUTES.project, { projectId: this.studioCtx.siteInfo.id })
    );
  }

  async setPopup(popup: Window | undefined) {
    this.popup = popup;
    if (this.popup) {
      await this.parseRoute();
    }
  }

  async getLocation(): Promise<Location> {
    if (this.popup) {
      const promise = new Promise<Location>((resolve) => {
        const listener = (event: MessageEvent) => {
          if (
            event.data.source === "plasmic-popup" &&
            event.data.type === "location"
          ) {
            window.removeEventListener("message", listener);

            const url = new URL(event.data.url);
            resolve({
              pathname: url.pathname,
              search: url.search,
              hash: url.hash,
              state: undefined,
            });
          }
        };
        window.addEventListener("message", listener);
      });

      this.popup.postMessage(
        {
          source: "plasmic-studio",
          type: "getLocation",
        },
        "*"
      );

      return promise;
    } else {
      return this.hostFrameCtx.history.location;
    }
  }

  async parseRoute() {
    const location = await this.getLocation();
    if (!isLiveMode(location.pathname)) {
      this.previewData = undefined;
      return;
    }

    let full = false;
    let matchRoute = parseRoute(APP_ROUTES.projectPreview, location.pathname);
    if (!matchRoute) {
      matchRoute = parseRoute(APP_ROUTES.projectFullPreview, location.pathname);
      if (matchRoute) {
        full = true;
      }
    }

    const previewPath = matchRoute?.params.previewPath || "";
    const componentPath = getComponentByPath(this.studioCtx, previewPath);

    const pageQuery = queryStringToRecord(location.search);

    const hashParams = new URLSearchParams(_.trimStart(location.hash, "#"));
    const pageHash = hashParams.get("pageHash") || "";
    const widthString = hashParams.get("width");
    const width = widthString ? parseInt(widthString) : DEFAULT_VIEWPORT_WIDTH;
    const heightString = hashParams.get("height");
    const height = heightString
      ? parseInt(heightString)
      : DEFAULT_VIEWPORT_HEIGHT;
    const branchName = hashParams.get(SEARCH_PARAM_BRANCH) || MainBranchId;

    let allVariants: VariantCombo = [];
    let variants: Record<string, string | string[]> = {};
    let global: Record<string, string | string[]> = {};
    if (componentPath) {
      try {
        variants = hackyCast(JSON.parse(hashParams.get("variants") || "{}"));
      } catch (e) {
        Sentry.captureException("Can't parse component variants", {
          extra: {
            variants: hashParams.get("variants"),
          },
        });
      }
      try {
        global = hackyCast(JSON.parse(hashParams.get("global") || "{}"));
      } catch (e) {
        Sentry.captureException("Can't parse global variants", {
          extra: {
            global: hashParams.get("global"),
          },
        });
      }
      allVariants = getAllVariants(
        this.studioCtx,
        componentPath.component,
        variants,
        global
      );
    }

    this.previewData = {
      full,
      previewPath,
      componentPath: componentPath || previewPath,
      pageQuery,
      pageHash,
      allVariants,
      variants,
      global,
      width,
      height,
      branchName,
    };
  }

  /**
   * Update the component with default page params and query params.
   * Optionally, specify the variants to show.
   */
  async pushComponent(component: Component, allVariants: VariantCombo = []) {
    return this.pushRoute({
      componentPath: {
        component,
        pageParams: component.pageMeta?.params || {},
      },
      pageQuery: component.pageMeta?.query || {},
      pageHash: "",
      allVariants,
    });
  }

  /** Handle navigation, whether via a link or an interaction. */
  async handleNavigation(href: string) {
    if (href.startsWith("#")) {
      const url = mkUrl(href);
      const pageHash = url.hash;
      return this.pushRoute({ pageHash });
    } else if (href.startsWith("/")) {
      const url = mkUrl(href);
      const pageHash = url.hash;
      const componentPath = getComponentByPath(this.studioCtx, url.pathname);
      const pageQuery = queryStringToRecord(url.search);
      return this.pushRoute({
        componentPath: componentPath || href,
        pageQuery,
        pageHash,
        allVariants: [],
      });
    } else {
      // external link clicked, don't navigate, but show a notification instead
      showCanvasPageNavigationNotification(this.studioCtx, href);
    }
  }

  /** Update the preview viewport. */
  async pushViewport(
    previewData: Partial<Pick<PreviewInputData, "width" | "height">>
  ) {
    return this.pushRoute(previewData);
  }

  /**
   * Update the preview viewport, but REPLACE the new location into history.
   *
   * Used for automatic resizing operations.
   */
  async replaceViewport(
    previewData: Partial<Pick<PreviewInputData, "width" | "height">>
  ) {
    return this.pushRoute(previewData, true);
  }

  private async pushRoute(
    {
      componentPath,
      pageQuery,
      pageHash,
      width,
      height,
      allVariants,
      branchName,
    }: Partial<PreviewInputData>,
    replace = false
  ) {
    if (!this.previewData) {
      await this.parseRoute();
    }

    const prev = ensure(this.previewData, "missing previous previewData");
    const location = mkPreviewRoute(this.studioCtx.siteInfo.id, {
      full: prev.full,
      componentPath: componentPath || prev.componentPath,
      pageQuery: pageQuery || prev.pageQuery,
      pageHash: pageHash !== undefined ? pageHash : prev.pageHash,
      width: width || prev.width,
      height: height || prev.height,
      allVariants: allVariants || prev.allVariants,
      branchName: branchName === undefined ? prev.branchName : branchName,
    });
    return this.pushRouteToHistoryOrPopup(location, replace);
  }

  private async pushRouteToHistoryOrPopup(
    location: LocationDescriptorObject,
    replace = false
  ): Promise<void> {
    if (this.popup) {
      this.popup.postMessage(
        {
          source: "plasmic-studio",
          type: replace ? "replaceHistory" : "pushHistory",
          url: (location.pathname ?? "") + location.search + location.hash,
        },
        "*"
      );
    } else {
      if (replace) {
        this.studioCtx.appCtx.history.replace(location);
      } else {
        this.studioCtx.appCtx.history.push(location);
      }
    }
  }

  getVariants(): VariantCombo {
    return getAllVariants(
      this.studioCtx,
      this.component,
      this.variants,
      this.global
    );
  }
}

function getAllVariants(
  studioCtx: StudioCtx,
  component: Component | undefined,
  variants: Record<string, string | string[]>,
  global: Record<string, string | string[]>
) {
  const componentVariants = component
    ? allComponentVariants(component).filter((v) =>
        isVariantActive(v, variants)
      )
    : [];

  const globalVariants = allGlobalVariants(studioCtx.site, {
    includeDeps: "all",
  }).filter((v) => !isScreenVariant(v) && isVariantActive(v, global));

  return [...componentVariants, ...globalVariants];
}

export function mkVariantsRecord(variants: VariantCombo) {
  return Object.fromEntries(
    [...getReferencedVariantGroups(variants)].map((vg) => {
      const vars = vg.variants.filter((v) => variants.includes(v));
      return tuple(
        toVarName(vg.param.variable.name),
        vars.length === 1
          ? toVarName(vars[0].name)
          : vars.map((v) => toVarName(v.name))
      );
    })
  );
}

function isVariantActive(
  variant: Variant,
  active: Record<string, string | string[]>
): boolean {
  const key = toVarName(variant.parent?.param.variable.name || variant.name);
  return (
    active[key] === toVarName(variant.name) ||
    (_.isArray(active[key]) && active[key].includes(toVarName(variant.name)))
  );
}

function mkPreviewPathname<PathParams extends {}>(
  route: Route<PathParams>,
  params: PathParams
) {
  // We do not use cli-routes U/R.fill because formatRoute (from
  // react-router-named-routes) does not currently support parameters
  // with asterisks.
  let path = route.pattern.replace("*", "");
  for (const [k, v] of Object.entries(params)) {
    path = path.replace(`:${k}`, _.trim(hackyCast(v), "/"));
  }
  return path;
}

export function isLiveMode(pathname: string) {
  return !!pathname.match("/preview");
}

function mkPreviewRoute(
  projectId: ProjectId,
  previewData: PreviewInputData
): LocationDescriptorObject {
  const { full, componentPath, pageQuery } = previewData;

  const pathname = mkPreviewPathname(
    full ? APP_ROUTES.projectFullPreview : APP_ROUTES.projectPreview,
    {
      projectId,
      previewPath:
        typeof componentPath === "string"
          ? componentPath
          : mkPreviewPath(componentPath.component, componentPath.pageParams),
    }
  );
  const search = mkPreviewSearch(
    pageQuery,
    typeof componentPath === "string" ? undefined : componentPath.component
  );
  const hash = mkPreviewHash(previewData);

  return {
    pathname,
    search,
    hash,
  };
}

/**
 * Makes a path for a component.
 * If page params are not supplied, the default preview page params will be used.
 */
function mkPreviewPath(
  component: Component,
  pageParams?: Record<string, string>
) {
  let path = component.pageMeta?.path || component.uuid;
  if (component.pageMeta) {
    path = substituteUrlParams(path, pageParams || component.pageMeta.params);
  }
  return path;
}

/**
 * Makes a query string for a component.
 * If query params are not supplied, the default preview query params will be used.
 */
function mkPreviewSearch(
  pageQuery: Record<string, string> | undefined,
  component: Component | undefined
) {
  const search = new URLSearchParams(
    pageQuery || component?.pageMeta?.query || {}
  ).toString();
  return search ? `?${search}` : "";
}

function mkPreviewHash({
  pageHash,
  full,
  width,
  height,
  allVariants,
  branchName,
}: PreviewInputData) {
  const hashParams = new URLSearchParams();

  if (pageHash) {
    hashParams.set("pageHash", pageHash);
  }
  if (!full) {
    hashParams.set("width", `${width}`);
    hashParams.set("height", `${height}`);
  }
  const variants = mkVariantsRecord(
    allVariants.filter((v) => !isGlobalVariant(v))
  );
  const global = mkVariantsRecord(
    allVariants.filter((v) => isGlobalVariant(v))
  );
  if (Object.keys(variants).length > 0) {
    hashParams.set("variants", JSON.stringify(variants));
  }
  if (Object.keys(global).length > 0) {
    hashParams.set("global", JSON.stringify(global));
  }
  if (branchName && branchName !== MainBranchId) {
    hashParams.set(SEARCH_PARAM_BRANCH, branchName);
  }

  const hash = hashParams.toString();
  return hash ? `#${hash}` : "";
}

export async function getUrlsForLiveMode(
  studioCtx: StudioCtx,
  full: boolean
): Promise<LocationDescriptorObject> {
  const viewCtx = await studioCtx.getPreviewInitialViewCtx();
  const arenaFrame = viewCtx.arenaFrame();
  const component = viewCtx.component;
  const pinManager = new ClientPinManager(
    viewCtx.componentStackFrames()[0],
    viewCtx.globalFrame,
    new Map()
  );
  const variants = allComponentNonStyleVariants(component).filter((v) =>
    pinManager.isActive(v)
  );
  const global = allGlobalVariants(viewCtx.site, {
    includeDeps: "all",
  }).filter((v) => !isScreenVariant(v) && pinManager.isActive(v));

  return mkPreviewRoute(studioCtx.siteInfo.id, {
    full,
    componentPath: {
      component: viewCtx.component,
      pageParams: viewCtx.component.pageMeta?.params || {},
    },
    pageQuery: viewCtx.component.pageMeta?.query || {},
    pageHash: "",
    allVariants: [...variants, ...global],
    width: full ? DEFAULT_VIEWPORT_WIDTH : arenaFrame.width,
    height: full ? DEFAULT_VIEWPORT_HEIGHT : getFrameHeight(arenaFrame),
    branchName: studioCtx.branchInfo()?.name ?? null,
  });
}

function mkUrl(href: string) {
  return new URL(href, "http://fake-url");
}

export function getComponentByPath(
  studioCtx: StudioCtx,
  componentPath: string
) {
  const matchComponents = studioCtx.site.components
    .filter(
      (c) =>
        c.uuid === componentPath ||
        (c.pageMeta &&
          getMatchingPagePathParams(c.pageMeta.path, componentPath))
    )
    // If we have two pages with paths like `/products/foo` and
    // `/products/[slug]`, we want to resolve to `/products/foo` to the first
    // one and all others to the second one. So, we sort the matched components
    // by the number of params in the path
    .map((c) => ({
      component: c,
      paramCount: [
        ...Object.keys(
          (c.pageMeta &&
            getMatchingPagePathParams(c.pageMeta.path, componentPath)) ||
            {}
        ),
      ].length,
    }))
    .sort(
      ({ paramCount: paramCount1 }, { paramCount: paramCount2 }) =>
        paramCount1 - paramCount2
    );

  if (matchComponents.length === 0) {
    return null;
  } else if (
    // Check for multiple components with the minimum number of path params
    matchComponents.length > 1 &&
    matchComponents[0].paramCount === matchComponents[1].paramCount
  ) {
    const error = new Error("Preview path matched more than one component");
    Sentry.captureException(error, {
      extra: {
        previewPath: componentPath,
        matchComponents: matchComponents.map(({ component }) => ({
          uuid: component.uuid,
          name: component.name,
          pagePath: component.pageMeta?.path,
        })),
      },
    });
  }

  const { component } = matchComponents[0];
  let pageParams = {};
  if (component?.pageMeta) {
    pageParams = getMatchingPagePathParams(
      component.pageMeta.path,
      componentPath
    );
  }
  return {
    component,
    pageParams,
  };
}

function queryStringToRecord(query: string): Record<string, string> {
  const url = mkUrl(query);
  const record = {};
  for (const [key, value] of url.searchParams) {
    record[key] = value;
  }
  return record;
}

const PreviewCtxContext = React.createContext<PreviewCtx | undefined>(
  undefined
);
export const providesPreviewCtx = withProvider(PreviewCtxContext.Provider);
export const usePreviewCtx = () =>
  ensure(React.useContext(PreviewCtxContext), "Expected PreviewCtx to exist");
