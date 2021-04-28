// tslint:disable:ordered-imports
// organize-imports-ignore
import "./preamble";

import * as ReactWeb from "@plasmicapp/react-web";
import * as mobx from "mobx";
import * as mobxReactLite from "mobx-react-lite";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as slate from "slate";
import * as slateReact from "slate-react";
import ResizeObserver from "resize-observer-polyfill";
import { globalHookCtx } from "./globalHook";
import { ensure } from "./lang-utils";
const root = require("window-or-global");

type PrimitiveType = "string" | "boolean" | "number" | "object" | "slot";

export interface ComponentMeta {
  name: string;
  props: { [prop: string]: PrimitiveType };
  /**
   * Either the path to the component relative to `rootDir` or the npm
   * package name
   */
  importPath: string;
  /**
   * Whether it's a default export or named export
   */
  isDefaultExport?: boolean;

  /**
   * The prop that expects CSS class names, required for styling code component
   * instances from Plasmic Studio. If not specified, it's assumed to be
   * "className".
   */
  classNameProp?: string;
}

export interface ComponentRegistration {
  component: React.ComponentType;
  meta: ComponentMeta;
}

export type Fetcher = (...args: any[]) => Promise<any>;

export interface FetcherMeta {
  args: { name: string; type: PrimitiveType }[];
  returns: PrimitiveType;
  /**
   * Either the path to the fetcher relative to `rootDir` or the npm
   * package name
   */
  importPath: string;
  /**
   * Whether it's a default export or named export
   */
  isDefaultExport?: boolean;
}

export interface FetcherRegistration {
  fetcher: Fetcher;
  meta: FetcherMeta;
}

declare global {
  interface Window {
    __PlasmicHostVersion: string;
    __PlasmicComponentRegistry: ComponentRegistration[];
    __PlasmicFetcherRegistry: FetcherRegistration[];
  }
}

self.__PlasmicHostVersion = "1";
self.__PlasmicComponentRegistry = [];
self.__PlasmicFetcherRegistry = [];
export function registerComponent(
  component: React.ComponentType<any>,
  meta: ComponentMeta
) {
  self.__PlasmicComponentRegistry.push({ component, meta });
}

export function registerFetcher(fetcher: Fetcher, meta: FetcherMeta) {
  self.__PlasmicFetcherRegistry.push({ fetcher, meta });
}

const plasmicRootNode: mobx.IObservableValue<React.ReactElement | null> = mobx.observable.box(
  null,
  { deep: false }
);

root.__Sub = {
  React,
  ReactDOM,
  ReactWeb,
  ResizeObserver,
  mobx,
  mobxReactLite,
  slate,
  slateReact,
  localObject: Object,
  localElement: Element,
  globalHookCtx,
  setPlasmicRootNode,
  registerRenderErrorListener,
};

export function renderStudioIntoIframe() {
  const script = document.createElement("script");
  const params = new URL(`https://fakeurl/${location.hash.replace(/#/, "?")}`)
    .searchParams;
  const plasmicOrigin = ensure(params.get("origin"));
  script.src = plasmicOrigin + "/static/js/studio.js";
  document.body.appendChild(script);
}

let renderCount = 0;
function setPlasmicRootNode(node: React.ReactElement | null) {
  // Keep track of renderCount, which we use as key to ErrorBoundary, so
  // we can reset the error on each render
  renderCount++;
  plasmicRootNode.set(node);
}

export const PlasmicCanvasHost = mobxReactLite.observer(
  function PlasmicCanvasHost() {
    // If window.parent is null, then this is a window whose containing iframe
    // has been detached from the DOM (for the top window, window.parent === window).
    // In that case, we shouldn't do anything.  If window.parent is null, by the way,
    // location.hash will also be null.
    const isFrameAttached = !!window.parent;
    const shouldRenderStudio =
      isFrameAttached &&
      !document.querySelector("#plasmic-studio-tag") &&
      !location.hash.match(/\bcanvas=true\b/) &&
      !location.hash.match(/\blive=true\b/);
    React.useEffect(() => {
      if (shouldRenderStudio && isFrameAttached) {
        renderStudioIntoIframe();
      }
    }, [shouldRenderStudio, isFrameAttached]);
    if (!isFrameAttached) {
      return null;
    }
    if (shouldRenderStudio) {
      return null;
    }
    return (
      <div id="app" className="__wab_user-body">
        <ErrorBoundary key={`${renderCount}`}>
          {plasmicRootNode.get()}
        </ErrorBoundary>
      </div>
    );
  }
);

type RenderErrorListener = (err: Error) => void;
const renderErrorListeners: RenderErrorListener[] = [];
function registerRenderErrorListener(listener: RenderErrorListener) {
  renderErrorListeners.push(listener);
  return () => {
    const index = renderErrorListeners.indexOf(listener);
    if (index >= 0) {
      renderErrorListeners.splice(index, 1);
    }
  };
}

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  error?: Error;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {};
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    renderErrorListeners.forEach((listener) => listener(error));
  }

  render() {
    if (this.state.error) {
      return <div>Error: {`${this.state.error.message}`}</div>;
    } else {
      return this.props.children;
    }
  }
}

ReactWeb.setPlumeStrictMode(false);
