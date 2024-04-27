import { ensureIsHostFrame, isHostFrame } from "@/wab/client/cli-routes";
import {
  providesFrameCtx,
  useFrameCtx,
} from "@/wab/client/frame-ctx/frame-ctx";
import { HostFrameApi } from "@/wab/client/frame-ctx/host-frame-api";
import { getPlasmicStudioArgs } from "@/wab/client/frame-ctx/plasmic-studio-args";
import { TopFrameFullApi } from "@/wab/client/frame-ctx/top-frame-api";
import { ensure, spawn, spawnWrapper } from "@/wab/common";
import { PromisifyMethods } from "@/wab/commons/promisify-methods";
import * as Comlink from "comlink";
import {
  createMemoryHistory,
  History,
  Href,
  LocationDescriptor,
  LocationDescriptorObject,
  LocationListener,
  Path,
  TransitionPromptHook,
  UnregisterCallback,
} from "history";
import * as React from "react";

export interface HostFrameCtx {
  topFrameApi: PromisifyMethods<TopFrameFullApi>;
  history: History;
  onHostFrameApiReady: (api: HostFrameApi) => void;
}

export interface HostFrameCtxProviderProps {
  children?: React.ReactNode;
}

export function HostFrameCtxProvider({ children }: HostFrameCtxProviderProps) {
  ensureIsHostFrame();

  const [hostFrameCtx, setHostFrameCtx] = React.useState<
    HostFrameCtx | undefined
  >(undefined);

  React.useEffect(() => {
    // This should be the same thing as window.top, but we'll just stick with a
    // 'relative path' in case the top-most frame ever wants to run inside an
    // iframe itself.
    const topFrame = ensure(window.parent?.parent, "Missing top frame");

    const plasmicOrigin = getPlasmicStudioArgs().origin;

    console.log("[HostFrame] Sending PLASMIC_HOST_REGISTERED message");
    topFrame.postMessage({ type: "PLASMIC_HOST_REGISTER" }, plasmicOrigin);

    const topFrameApi: PromisifyMethods<TopFrameFullApi> = Comlink.wrap(
      Comlink.windowEndpoint(topFrame, self, plasmicOrigin)
    );

    const hostHistory = new HostHistory(topFrameApi);

    setHostFrameCtx({
      history: hostHistory,
      topFrameApi,
      onHostFrameApiReady: (api) => {
        console.log("[HostFrame] HostFrameApi ready, exposing API to TopFrame");
        // complex objects sent over Comlink must be proxied
        spawn(topFrameApi.exposeHostFrameApi(Comlink.proxy(api)));
      },
    });
    return spawnWrapper(hostHistory.dispose);
  }, []);

  // block children until connected to TopFrame
  return providesFrameCtx(hostFrameCtx)(hostFrameCtx ? children : null);
}

/**
 * Returns HostFrameCtx.
 * @throws if not HostFrame
 * @throws if HostFrameCtx not provided
 */
export function useHostFrameCtx(): HostFrameCtx {
  ensureIsHostFrame();
  return useFrameCtx();
}

/**
 * Returns HostFrameCtx if host frame, undefined otherwise.
 * @throws if HostFrameCtx not provided
 */
export function useHostFrameCtxIfHostFrame(): HostFrameCtx | undefined {
  return isHostFrame() ? useFrameCtx() : undefined;
}

/**
 * A wrapper around a MemoryHistory that is kept in sync with the top frame's history.
 *
 * All "read" methods are supported.
 * Only push and replace "write" methods are supported.
 */
class HostHistory implements History<unknown> {
  private readonly memoryHistory = createMemoryHistory();
  private readonly unregisterLocationListenerPromise: Promise<() => void>;

  constructor(private readonly topFrameApi: PromisifyMethods<TopFrameFullApi>) {
    // complex objects sent over Comlink must be proxied
    this.unregisterLocationListenerPromise =
      topFrameApi.registerLocationListener(
        Comlink.proxy((location, action) => {
          const path = location.pathname + location.search + location.hash;
          console.log(
            `Host history ${action} ${location.key} ${path}`,
            history
          );
          switch (action) {
            case "PUSH": {
              // Store key in state. Used later in POP.
              this.memoryHistory.push(path, location.key);
              break;
            }
            case "REPLACE": {
              // Store key in state. Used later in POP.
              this.memoryHistory.replace(path, location.key);
              break;
            }
            case "POP": {
              // POP has multiple scenarios.
              // https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event

              const targetIndex = this.memoryHistory.entries.findIndex(
                (entry) => entry.state === location.key
              );
              if (targetIndex >= 0) {
                // The most common is browser back/forward.
                // We can check if it's in our history using the key stored in state.
                this.memoryHistory.go(targetIndex - this.memoryHistory.index);
              } else {
                // In all other scenarios:
                // - user changed hash
                // - browser back/forward outside our history (e.g. user refreshed at some point)
                // We simply push a new location since we can't handle it any other way.
                this.memoryHistory.push(path, location.key);
              }
              break;
            }
          }
        })
      );
  }

  dispose = async () => {
    const unregister = await this.unregisterLocationListenerPromise;
    unregister();
  };

  get action() {
    return this.memoryHistory.action;
  }
  block = (
    _prompt: boolean | string | TransitionPromptHook | undefined
  ): UnregisterCallback => {
    throw new Error("unsupported HostHistory method");
  };
  createHref = (location: LocationDescriptorObject): Href => {
    return this.memoryHistory.createHref(location);
  };
  get length() {
    return this.memoryHistory.length;
  }
  listen = (listener: LocationListener): UnregisterCallback => {
    return this.memoryHistory.listen(listener);
  };
  get location() {
    return this.memoryHistory.location;
  }
  go = (_n: number): void => {
    throw new Error("unsupported HostHistory method");
  };
  goBack = (): void => {
    throw new Error("unsupported HostHistory method");
  };
  goForward = (): void => {
    throw new Error("unsupported HostHistory method");
  };
  push = (path: Path | LocationDescriptor, _state?: unknown): void => {
    const { pathname, search, hash } = toPathSearchHash(path);
    spawn(this.topFrameApi.pushLocation(pathname, search, hash));
  };
  replace = (path: Path | LocationDescriptor, _state?: unknown): void => {
    const { pathname, search, hash } = toPathSearchHash(path);
    spawn(this.topFrameApi.replaceLocation(pathname, search, hash));
  };
}

function toPathSearchHash(path: Path | LocationDescriptor): {
  pathname?: string;
  search?: string;
  hash?: string;
} {
  return typeof path === "string" ? new URL(path, "http://fake-url") : path;
}
