import * as React from "react";
import * as ReactDOM from "react-dom";
import useForceUpdate from "./useForceUpdate";

declare global {
  interface Window {
    __PlasmicHostVersion: string;
  }
}

if ((globalThis as any).__PlasmicHostVersion == null) {
  (globalThis as any).__PlasmicHostVersion = "3";
}

const rootChangeListeners: (() => void)[] = [];
class PlasmicRootNodeWrapper {
  constructor(private value: null | React.ReactElement) {}
  set = (val: null | React.ReactElement) => {
    this.value = val;
    rootChangeListeners.forEach((f) => f());
  };
  get = () => this.value;
}

const plasmicRootNode = new PlasmicRootNodeWrapper(null);

function getHashParams() {
  return new URLSearchParams(location.hash.replace(/^#/, "?"));
}

const STUDIO_SCRIPT_ID = "plasmic-studio-script";
const PLASMIC_STUDIO_ORIGINS: readonly string[] = [
  "https://studio.plasmic.app",
];
const PLASMIC_STATIC_BASE_URL = "https://studio-static.plasmic.app";

function parseStudioUrl(value: string | null | undefined): URL | undefined {
  // Reject delimiters even when empty (URL.search/hash omit empty ?/#), and
  // characters that URL parsing would silently normalize.
  if (!value || !/^https?:\/\//.test(value) || /[\s\\?#]/.test(value)) {
    return undefined;
  }
  try {
    const url = new URL(value);
    return url.username || url.password ? undefined : url;
  } catch {
    return undefined;
  }
}

function isUnder(url: URL, base: URL | undefined) {
  return (
    !!base &&
    url.origin === base.origin &&
    `${url.pathname}/`.startsWith(base.pathname.replace(/\/?$/, "/"))
  );
}

function renderStudioIntoIframe({
  allowedStudioOrigins,
  allowedStudioStaticBaseUrl,
}: PlasmicCanvasHostProps) {
  if (document.getElementById(STUDIO_SCRIPT_ID)) {
    return;
  }
  // A self-hosted Studio must not also trust Plasmic's.
  const useDefaults = !allowedStudioOrigins && !allowedStudioStaticBaseUrl;
  const studioOrigins = useDefaults
    ? PLASMIC_STUDIO_ORIGINS
    : (allowedStudioOrigins ?? []);
  const staticBaseUrl = parseStudioUrl(
    useDefaults ? PLASMIC_STATIC_BASE_URL : allowedStudioStaticBaseUrl,
  );
  // Read and validate at injection point, not during render. The fragment
  // can change between render and the effect that loads the script.
  const params = getHashParams();
  const origin = parseStudioUrl(params.get("origin"));
  const base = parseStudioUrl(
    params.get("staticBaseUrl") ?? params.get("origin"),
  );
  const hash = params.get("studioHash");
  if (
    !origin ||
    origin.pathname !== "/" ||
    !studioOrigins.includes(origin.origin) ||
    !base ||
    !(studioOrigins.includes(base.origin) || isUnder(base, staticBaseUrl)) ||
    (hash && !/^[a-zA-Z0-9_-]+$/.test(hash))
  ) {
    console.warn(
      "[PlasmicCanvasHost] Blocked an invalid or untrusted Studio URL. " +
        "For a self-hosted Studio, configure allowedStudioOrigins and allowedStudioStaticBaseUrl.",
    );
    return;
  }
  const script = document.createElement("script");
  script.id = STUDIO_SCRIPT_ID;
  script.src = `${base.href.replace(/\/$/, "")}/js/studio${hash ? `.${hash}` : ""}.js`;
  document.body.appendChild(script);
}

const HIDE_HOST_OVERLAYS_STYLE_ID = "plasmic-hide-host-overlays";

/**
 * Hide the NextJS dev overlay, rendered as a <nextjs-portal>, when running in an iframe
 */
function hideHostOverlaysInStudioIframe() {
  if (document.getElementById(HIDE_HOST_OVERLAYS_STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = HIDE_HOST_OVERLAYS_STYLE_ID;
  style.textContent = `nextjs-portal { display: none !important; }`;
  document.head.appendChild(style);
}

let renderCount = 0;
export function setPlasmicRootNode(node: React.ReactElement | null) {
  // Keep track of renderCount, which we use as key to ErrorBoundary, so
  // we can reset the error on each render
  renderCount++;
  plasmicRootNode.set(node);
}

export interface PlasmicCanvasContextValue {
  componentName: string | null;
  globalVariants: Record<string, string>;
  interactive?: boolean;
}

/**
 * React context to detect whether the component is rendered on Plasmic editor.
 * If not, return false.
 * If so, return an object with more information about the component
 */
export const PlasmicCanvasContext = React.createContext<
  PlasmicCanvasContextValue | false
>(false);
export const usePlasmicCanvasContext = () =>
  React.useContext(PlasmicCanvasContext);

function _PlasmicCanvasHost({
  allowedStudioOrigins,
  allowedStudioStaticBaseUrl,
}: PlasmicCanvasHostProps) {
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
    // Hide framework dev overlays when running in Studio
    if (isFrameAttached && window.parent !== window) {
      hideHostOverlaysInStudioIframe();
    }
  }, [isFrameAttached]);
  React.useEffect(() => {
    if (shouldRenderStudio && isFrameAttached && window.parent !== window) {
      renderStudioIntoIframe({
        allowedStudioOrigins,
        allowedStudioStaticBaseUrl,
      });
    }
  }, [
    shouldRenderStudio,
    isFrameAttached,
    allowedStudioOrigins,
    allowedStudioStaticBaseUrl,
  ]);

  const [canvasContextValue, setCanvasContextValue] = React.useState(() =>
    deriveCanvasContextValue(),
  );

  React.useEffect(() => {
    if (isCanvas) {
      const listener = () => {
        setCanvasContextValue(deriveCanvasContextValue());
      };
      window.addEventListener("hashchange", listener);
      return () => window.removeEventListener("hashchange", listener);
    }
    return undefined;
  }, [isCanvas]);
  if (!isFrameAttached) {
    return null;
  }
  if (isCanvas || isLive) {
    let appDiv = document.querySelector("#plasmic-app.__wab_user-body");
    if (!appDiv) {
      appDiv = document.createElement("div");
      appDiv.id = "plasmic-app";
      appDiv.classList.add("__wab_user-body");
      document.body.prepend(appDiv);
    }
    return ReactDOM.createPortal(
      <ErrorBoundary key={`${renderCount}`}>
        <PlasmicCanvasContext.Provider value={canvasContextValue}>
          {plasmicRootNode.get()}
        </PlasmicCanvasContext.Provider>
      </ErrorBoundary>,
      appDiv,
      "plasmic-app",
    );
  }
  if (shouldRenderStudio && window.parent === window) {
    return (
      <iframe
        src={`https://docs.plasmic.app/app-content/app-host-ready#appHostUrl=${encodeURIComponent(
          location.href,
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
   * Trusted Studio origins, replacing Plasmic's. Grants script execution on
   * your app's origin; never derive from user-controlled input.
   */
  allowedStudioOrigins?: readonly string[];
  /**
   * Trusted base URL for Studio assets, if not served from a Studio origin.
   * Setting either prop drops Plasmic's defaults.
   */
  allowedStudioStaticBaseUrl?: string;
  /**
   * @deprecated HMR handling is now managed by Plasmic Studio. This prop is
   * retained for backward compatibility and has no effect.
   */
  enableWebpackHmr?: boolean;
}

export const PlasmicCanvasHost: React.FunctionComponent<
  PlasmicCanvasHostProps
> = ({ allowedStudioOrigins, allowedStudioStaticBaseUrl }) => {
  const [node, setNode] = React.useState<React.ReactElement<any, any> | null>(
    null,
  );
  React.useEffect(() => {
    setNode(
      <_PlasmicCanvasHost
        allowedStudioOrigins={allowedStudioOrigins}
        allowedStudioStaticBaseUrl={allowedStudioStaticBaseUrl}
      />,
    );
  }, [allowedStudioOrigins, allowedStudioStaticBaseUrl]);
  return <>{node}</>;
};

type RenderErrorListener = (err: Error) => void;
const renderErrorListeners: RenderErrorListener[] = [];
export function registerRenderErrorListener(listener: RenderErrorListener) {
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
      return <>{this.props.children}</>;
    }
  }
}

function deriveCanvasContextValue(): PlasmicCanvasContextValue | false {
  const hash = window.location.hash;
  if (hash && hash.length > 0) {
    // create URLsearchParams skipping the initial # character
    const params = new URLSearchParams(hash.substring(1));
    if (params.get("canvas") === "true") {
      const globalVariants = params.get("globalVariants");
      return {
        componentName: params.get("componentName") ?? null,
        globalVariants: globalVariants ? JSON.parse(globalVariants) : {},
        interactive: params.get("interactive") === "true",
      };
    }
  }
  return false;
}

const INTERNAL_CC_CANVAS_SELECTION_PROP = "__plasmic_selection_prop__";

export function usePlasmicCanvasComponentInfo(props: any) {
  return React.useMemo(() => {
    // Inside Plasmic Studio, code components will receive an additional prop
    // that contains selection information for that specific code component.
    // This hook will return that selection information which is useful for
    // changing the behavior of the code component when it is selected, making
    // it easier to interact with code components and slots that aren't always
    // visible in the canvas. (e.g. automatically opening a modal when it's selected)
    const selectionInfo = props?.[INTERNAL_CC_CANVAS_SELECTION_PROP];
    if (selectionInfo) {
      return {
        isSelected: selectionInfo.isSelected as boolean,
        selectedSlotName: selectionInfo.selectedSlotName as string | undefined,
      };
    }
    return null;
  }, [props]);
}
