// tslint:disable:ordered-imports
// organize-imports-ignore
import "@plasmicapp/preamble";

import * as ReactWeb from "@plasmicapp/react-web";
import * as mobx from "mobx";
import * as mobxReactLite from "mobx-react-lite";
import * as React from "react";
import * as ReactDOM from "react-dom";
import ResizeObserver from "resize-observer-polyfill";
import * as slate from "slate";
import * as slateReact from "slate-react";
import { ensure } from "./lang-utils";
const root = require("window-or-global");

mobx.configure({ isolateGlobalState: true, enforceActions: "never" });

export type PropType =
  | "string"
  | "boolean"
  | "number"
  | "object"
  | "slot"
  | {
      type: "string";
      defaultValue?: string;
    }
  | {
      type: "boolean";
      defaultValue?: boolean;
    }
  | {
      type: "number";
      defaultValue?: number;
    }
  | {
      type: "object";
      /**
       * Expects a JSON-compatible value
       */
      defaultValue?: any;
    }
  | {
      type: "slot";
      /**
       * The unique names of all code components that can be placed in the slot
       */
      allowedComponents?: string[];
    };

export interface ComponentMeta<P> {
  /**
   * Any unique string name used to identify that component. Each component
   * should be registered with a different `meta.name`, even if they have the
   * same name in the code.
   */
  name: string;
  /**
   * The name to be displayed for the component in Studio. Optional: if not
   * specified, `meta.name` is used.
   */
  displayName?: string;
  /**
   * The javascript name to be used when generating code. Optional: if not
   * provided, `meta.name` is used.
   */
  importName?: string;
  /**
   * An object describing the component properties to be used in Studio.
   * For each `prop`, there should be an entry `meta.props[prop]` describing
   * its type.
   */
  props: { [prop in keyof P]: PropType } & { [prop: string]: PropType };
  /**
   * The path to be used when importing the component in the generated code.
   * It can be the name of the package that contains the component, or the path
   * to the file in the project (relative to the root directory).
   */
  importPath: string;
  /**
   *  Whether the component is the default export from that path. Optional: if
   * not specified, it's considered `false`.
   */
  isDefaultExport?: boolean;
  /**
   * The prop that expects the CSS classes with styles to be applied to the
   * component. Optional: if not specified, Plasmic will expect it to be
   * `className`. Notice that if the component does not accept CSS classes, the
   * component will not be able to receive styles from the Studio.
   */
  classNameProp?: string;
  /**
   * The prop that receives and forwards a React `ref`. Plasmic only uses `ref`
   * to interact with components, so it's not used in the generated code.
   * Optional: If not provided, the usual `ref` is used.
   */
  refProp?: string;
}

export interface ComponentRegistration {
  component: React.ComponentType<any>;
  meta: ComponentMeta<any>;
}

export type Fetcher = (...args: any[]) => Promise<any>;

export interface FetcherMeta {
  /**
   * Any unique identifying string for this fetcher.
   */
  name: string;
  /**
   * The Studio-user-friendly display name.
   */
  displayName?: string;
  /**
   * The symbol to import from the importPath.
   */
  importName?: string;
  args: { name: string; type: PropType }[];
  returns: PropType;
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

root.__PlasmicHostVersion = "1";
root.__PlasmicComponentRegistry = [];
root.__PlasmicFetcherRegistry = [];

export function registerComponent<P = {}>(
  component: React.ComponentType<P>,
  meta: ComponentMeta<P>
) {
  root.__PlasmicComponentRegistry.push({ component, meta });
}

export function registerFetcher(fetcher: Fetcher, meta: FetcherMeta) {
  root.__PlasmicFetcherRegistry.push({ fetcher, meta });
}

const plasmicRootNode: mobx.IObservableValue<React.ReactElement | null> =
  mobx.observable.box(null, { deep: false });

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
  localElement: typeof window !== "undefined" ? Element : undefined,
  setPlasmicRootNode,
  registerRenderErrorListener,
};

function getPlasmicOrigin() {
  const params = new URL(`https://fakeurl/${location.hash.replace(/#/, "?")}`)
    .searchParams;
  return ensure(
    params.get("origin"),
    "Missing information from Plasmic window."
  );
}

function renderStudioIntoIframe() {
  const script = document.createElement("script");
  const plasmicOrigin = getPlasmicOrigin();
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

/**
 * React context to detect whether the component is rendered on Plasmic editor.
 */
export const PlasmicCanvasContext = React.createContext<boolean>(false);

const _PlasmicCanvasHost = mobxReactLite.observer(function PlasmicCanvasHost() {
  // If window.parent is null, then this is a window whose containing iframe
  // has been detached from the DOM (for the top window, window.parent === window).
  // In that case, we shouldn't do anything.  If window.parent is null, by the way,
  // location.hash will also be null.
  const isFrameAttached = !!window.parent;
  const isCanvas = !!location.hash?.match(/\bcanvas=true\b/);
  const isLive = !!location.hash?.match(/\blive=true\b/) || !isFrameAttached;
  const shouldRenderStudio =
    isFrameAttached &&
    !document.querySelector("#plasmic-studio-tag") &&
    !isCanvas &&
    !isLive;
  React.useEffect(() => {
    if (shouldRenderStudio && isFrameAttached && window.parent !== window) {
      renderStudioIntoIframe();
    }
  }, [shouldRenderStudio, isFrameAttached]);
  React.useEffect(() => {
    if (!shouldRenderStudio && !document.querySelector("#getlibs") && isLive) {
      const scriptElt = document.createElement("script");
      scriptElt.id = "getlibs";
      scriptElt.src = getPlasmicOrigin() + "/static/js/getlibs.js";
      scriptElt.async = false;
      scriptElt.onload = () => {
        (window as any).__GetlibsReadyResolver?.();
      };
      document.head.append(scriptElt);
    }
  }, [shouldRenderStudio]);
  if (!isFrameAttached) {
    return null;
  }
  if (isCanvas || isLive) {
    let appDiv = document.querySelector("#plasmic-app.__wab_user-body");
    if (!appDiv) {
      appDiv = document.createElement("div");
      appDiv.id = "plasmic-app";
      appDiv.classList.add("__wab_user-body");
      document.body.appendChild(appDiv);
    }
    return ReactDOM.createPortal(
      <ErrorBoundary key={`${renderCount}`}>
        <PlasmicCanvasContext.Provider value={isCanvas}>
          {plasmicRootNode.get()}
        </PlasmicCanvasContext.Provider>
      </ErrorBoundary>,
      appDiv,
      "plasmic-app"
    );
  }
  if (shouldRenderStudio && window.parent === window) {
    return (
      <p>
        Your app is ready to host Plasmic Studio! <br /> <br />
        On the <a href="https://studio.plasmic.app/">Dashboard</a>, click on the{" "}
        <i>Config</i> button, and set{" "}
        <code>{location.origin + location.pathname}</code> as the host URL.
        <br />
        <br />
        You can find more information about app-hosting{" "}
        <a href="https://www.plasmic.app/learn/app-hosting/">here</a>.
      </p>
    );
  }
  return null;
});

export const PlasmicCanvasHost: React.FunctionComponent = () => {
  const [node, setNode] =
    React.useState<React.ReactElement<any, any> | null>(null);
  React.useEffect(() => {
    setNode(<_PlasmicCanvasHost />);
  }, []);
  return node;
};

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

  componentDidCatch(error: Error) {
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
