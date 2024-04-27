import { filteredApi } from "@/wab/client/api";
import { ensureIsTopFrame } from "@/wab/client/cli-routes";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  providesFrameCtx,
  useFrameCtx,
  useFrameCtxMaybe,
} from "@/wab/client/frame-ctx/frame-ctx";
import { HostFrameApi } from "@/wab/client/frame-ctx/host-frame-api";
import {
  TopFrameApi,
  TopFrameFullApi,
} from "@/wab/client/frame-ctx/top-frame-api";
import { assert } from "@/wab/common";
import { PromisifyMethods } from "@/wab/commons/promisify-methods";
import { bindMethods } from "@/wab/commons/proxies";
import * as Comlink from "comlink";
import { UnregisterCallback } from "history";
import * as React from "react";

export interface TopFrameCtx {
  hostFrameApi: PromisifyMethods<HostFrameApi>;
  hostFrameApiReady: boolean;
  hostConnected: boolean;
}

export interface TopFrameCtxProviderProps {
  children: React.ReactNode;
  projectId: string;
  topFrameApi: TopFrameApi;
}

export function TopFrameCtxProvider({
  children,
  projectId,
  topFrameApi,
}: TopFrameCtxProviderProps) {
  ensureIsTopFrame();

  const appCtx = useAppCtx();

  const [topFrameCtx, setTopFrameCtx] = React.useState<TopFrameCtx>({
    hostConnected: false,
    hostFrameApiReady: false,
    hostFrameApi: new Proxy({} as Comlink.Remote<HostFrameApi>, {
      get() {
        throw new Error(`HostFrameApi not ready`);
      },
    }),
  });

  React.useEffect(() => {
    let comlinkState:
      | undefined
      | {
          hostFrameEndpoint: Comlink.Endpoint;
          listener: EventListenerOrEventListenerObject;
        } = undefined;
    console.log("[TopFrame] Listening for PLASMIC_HOST_REGISTERED message");
    const listener = (ev: MessageEvent) => {
      if (ev.data?.type !== "PLASMIC_HOST_REGISTER") {
        return;
      }

      window.removeEventListener("message", listener);

      // Comlink needs to know who to expose to, but we don't have a direct
      // reference to the nested iframe, only the immediate child iframe here.
      // We thus first listen for a message from the nested iframe, which lets
      // us determine the source. Ideally Comlink could have a mode where it
      // responds to whoever sent the message.
      //
      // It's important that we synchronously run `expose`, which starts
      // listening for messages, since we may have already received another
      // message that's waiting for us in the event queue. The child frame
      // does not wait for a response to the registration before it starts
      // making RPCs.
      const hostFrame = ev.source;
      if (!hostFrame || !("postMessage" in hostFrame)) {
        throw new Error("Missing HostFrame");
      }
      const hostFrameEndpoint = Comlink.windowEndpoint(hostFrame as Window);

      console.log(
        "[TopFrame] Received PLASMIC_HOST_REGISTER message, exposing API to HostFrame"
      );
      const api = filteredApi(
        projectId,
        bindMethods(appCtx.api),
        appCtx.appConfig
      );
      const topFrameCtxApi: TopFrameFullApi = {
        exposeHostFrameApi: (hostFrameApi: Comlink.Remote<HostFrameApi>) => {
          setTopFrameCtx((prev) => ({
            ...prev,
            hostFrameApi,
            hostFrameApiReady: true,
          }));
        },
        ...api,
        ...topFrameApi,

        // Override some methods to hide Comlink implementation details.
        registerLocationListener(locationListener): UnregisterCallback {
          return Comlink.proxy(
            topFrameApi.registerLocationListener(locationListener)
          );
        },

        toJSON() {
          // When we do console.log(studioCtx) in the inner frame, fullstory
          // tries to jsonify studioCtx, converting all descendant objects
          // into json to record in fullstory, eventually calling api.toJSON().
          // So we add that method here to prevent comlink from trying to call a
          // non-existent function on our API object.
          return "API";
        },
      } as TopFrameFullApi;
      Comlink.expose(topFrameCtxApi, {
        ...hostFrameEndpoint,
        addEventListener(
          type: string,
          _listener: EventListenerOrEventListenerObject,
          options?: {}
        ) {
          if (type === "message") {
            assert(
              comlinkState === undefined,
              () => "Unexpected registering multiple message event listeners"
            );
            comlinkState = {
              hostFrameEndpoint: hostFrameEndpoint,
              listener: _listener,
            };
          }
          return hostFrameEndpoint.addEventListener(type, _listener, options);
        },
      });

      setTopFrameCtx((prev) => ({
        ...prev,
        hostConnected: true,
      }));
    };
    window.addEventListener("message", listener);
    return () => {
      window.removeEventListener("message", listener);
      if (comlinkState) {
        comlinkState.hostFrameEndpoint.removeEventListener(
          "message",
          comlinkState.listener
        );
      }
    };
  }, []);

  return providesFrameCtx(topFrameCtx)(children);
}

/**
 * Returns TopFrameCtx.
 * @throws if not top frame
 * @throws if TopFrameCtx not provided
 */
export function useTopFrameCtx(): TopFrameCtx {
  ensureIsTopFrame();
  return useFrameCtx();
}

/** Returns TopFrameCtx if TopFrameCtx provided, undefined otherwise. */
export function useTopFrameCtxMaybe(): TopFrameCtx | undefined {
  return useFrameCtxMaybe();
}
