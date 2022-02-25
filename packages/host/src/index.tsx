// tslint:disable:ordered-imports
// organize-imports-ignore
import "@plasmicapp/preamble";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { registerFetcher as unstable_registerFetcher } from "./fetcher";
import { PlasmicElement } from "./element-types";
import { ensure } from "./lang-utils";
import registerComponent, {
  ComponentMeta,
  ComponentRegistration,
  ComponentTemplates,
  PrimitiveType,
  PropType,
} from "./registerComponent";
import registerGlobalContext, {
  GlobalContextMeta,
  GlobalContextRegistration,
  PropType as GlobalContextPropType,
} from "./registerGlobalContext";
import repeatedElement, { setRepeatedElementFn } from "./repeatedElement";
import useForceUpdate from "./useForceUpdate";
import {
  DataProvider,
  useDataEnv,
  useSelector,
  useSelectors,
  applySelector,
  DataCtxReader,
} from "./data";
const root = globalThis as any;

export { unstable_registerFetcher };
export { repeatedElement };
export {
  registerComponent,
  ComponentMeta,
  ComponentRegistration,
  ComponentTemplates,
  PrimitiveType,
  PropType,
};
export {
  registerGlobalContext,
  GlobalContextMeta,
  GlobalContextRegistration,
  GlobalContextPropType,
};
export { PlasmicElement };
export * from "./data";

declare global {
  interface Window {
    __PlasmicHostVersion: string;
  }
}

if (root.__PlasmicHostVersion == null) {
  root.__PlasmicHostVersion = "2";
}

const rootChangeListeners: (() => void)[] = [];
class PlasmicRootNodeWrapper {
  constructor(private value: null | React.ReactElement) {}
  set = (val: null | React.ReactElement) => {
    this.value = val;
    rootChangeListeners.forEach(f => f());
  };
  get = () => this.value;
}

const plasmicRootNode = new PlasmicRootNodeWrapper(null);

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

function _PlasmicCanvasHost() {
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
  const forceUpdate = useForceUpdate();
  React.useLayoutEffect(() => {
    rootChangeListeners.push(forceUpdate);
    return () => {
      const index = rootChangeListeners.indexOf(forceUpdate);
      if (index >= 0) {
        rootChangeListeners.splice(index, 1);
      }
    };
  }, [forceUpdate]);
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
      <iframe
        src={`https://docs.plasmic.app/app-content/app-host-ready#appHostUrl=${encodeURIComponent(
          location.href
        )}`}
        style={{
          width: "100vw",
          height: "100vh",
          border: "none",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 99999999,
        }}
      ></iframe>
    );
  }
  return null;
}

interface PlasmicCanvasHostProps {
  /**
   * Webpack hmr uses EventSource to	listen to hot reloads, but that
   * resultsin a persistent	connection from	each window.  In Plasmic
   * Studio, if a project is configured to use app-hosting with a
   * nextjs or gatsby server running in dev mode, each artboard will
   * be holding a persistent connection to the dev server.
   * Because browsers	have a limit to	how many connections can
   * be held	at a time by domain, this means	after X	artboards, new
   * artboards will freeze and not load.
   *
   * By default, <PlasmicCanvasHost /> will globally mutate
   * window.EventSource to avoid using EventSource for HMR, which you
   * typically don't need for your custom host page.  If you do still
   * want to retain HRM, then youc an pass enableWebpackHmr={true}.
   */
  enableWebpackHmr?: boolean;
}

export const PlasmicCanvasHost: React.FunctionComponent<PlasmicCanvasHostProps> = props => {
  const { enableWebpackHmr } = props;
  const [node, setNode] = React.useState<React.ReactElement<any, any> | null>(
    null
  );
  React.useEffect(() => {
    setNode(<_PlasmicCanvasHost />);
  }, []);
  return (
    <>
      {!enableWebpackHmr && <DisableWebpackHmr />}
      {node}
    </>
  );
};

if (root.__Sub == null) {
  // Creating a side effect here by logging, so that vite won't
  // ignore this block for whatever reason
  console.log("Plasmic: Setting up app host dependencies");
  root.__Sub = {
    React,
    ReactDOM,

    // Must include all the dependencies used by canvas rendering,
    // and canvas-package (all hostless packages) from host
    setPlasmicRootNode,
    registerRenderErrorListener,
    repeatedElement,
    setRepeatedElementFn,
    PlasmicCanvasContext,
    DataProvider,
    useDataEnv,
    useSelector,
    useSelectors,
    applySelector,
    DataCtxReader,
  };
}

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
    renderErrorListeners.forEach(listener => listener(error));
  }

  render() {
    if (this.state.error) {
      return <div>Error: {`${this.state.error.message}`}</div>;
    } else {
      return this.props.children;
    }
  }
}

function DisableWebpackHmr() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  return (
    <script
      type="text/javascript"
      dangerouslySetInnerHTML={{
        __html: `
      if (typeof window !== "undefined") {
        const RealEventSource = window.EventSource;
        window.EventSource = function(url, config) {
          if (/[^a-zA-Z]hmr($|[^a-zA-Z])/.test(url)) {
            console.warn("Plasmic: disabled EventSource request for", url);
            return {
              onerror() {}, onmessage() {}, onopen() {}, close() {}
            };
          } else {
            return new RealEventSource(url, config);
          }
        }
      }
      `,
      }}
    ></script>
  );
}
