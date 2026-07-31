import { ensureIsTopFrame } from "@/wab/client/cli-routes";
import { ENV } from "@/wab/client/env";
import { encodeUriParams } from "@/wab/commons/urls";
import { ensure } from "@/wab/shared/common";
import { DevFlagsType } from "@/wab/shared/devflags";
import { getStaticBaseUrl } from "@/wab/shared/urls";

/**
 * Args to pass from top frame to host frame.
 *
 * This data is the first communication from top frame to host frame.
 * Only critical initialization data should be passed in here (e.g. setting up Comlink).
 * Other data should be communicated over window message passing and Comlink.
 */
export interface PlasmicStudioArgs {
  /** Origin of the top frame */
  origin: string;
  /** Base URL for static assets */
  staticBaseUrl: string;
  isProd: boolean;
  /** Encoded with encodeUriParams, e.g. "foo=bar&baz=true" */
  appConfigOverrides: string;
  /** The hash to load studio.js with, as studio.[hash].js */
  studioHash: string | null;
}

const keyOrigin = "origin";
const keyStaticBaseUrl = "staticBaseUrl";
const keyIsProd = "isProd";
const keyAppConfigOverrides = "appConfigOverrides";
const keyStudioHash = "studioHash";

/**
 * Build args hash to be passed from top frame to host frame.
 *
 * We send the params via a hash parameter so that the host server cannot see them.
 * These params are then saved to window.__PlasmicStudioArgs in the host frame.
 * See wab/create-react-app-new/packages/react-scripts/config/studio.js
 */
export function buildPlasmicStudioArgsHash(
  appConfigOverrides: Partial<DevFlagsType>
): string {
  ensureIsTopFrame();

  const params: [key: string, value: string][] = [];
  params.push([keyOrigin, origin]);
  params.push([keyStaticBaseUrl, getStaticBaseUrl()]);
  params.push([keyIsProd, (window as any).isProd || false]);
  params.push([
    keyAppConfigOverrides,
    encodeUriParams(
      Object.entries(appConfigOverrides).filter(
        ([_, value]) => typeof value !== "object"
      )
    ),
  ]);
  params.push([keyStudioHash, ENV.COMMITHASH]);

  return `#${encodeUriParams(params)}`;
}

/** Get params passed from top frame to host frame. */
export function getPlasmicStudioArgs(): PlasmicStudioArgs {
  const hash = (window as any).__PlasmicStudioArgs;
  const params = new URLSearchParams(hash.replace(/^#/, "?"));
  const origin = ensure(
    params.get(keyOrigin),
    "Missing origin hash param in host frame"
  );
  const staticBaseUrl = params.get(keyStaticBaseUrl) || origin;
  const isProd = params.get(keyIsProd) === "true";
  const appConfigOverrides = params.get(keyAppConfigOverrides) || "";
  const studioHash = params.get(keyStudioHash);
  return {
    origin,
    staticBaseUrl,
    isProd,
    appConfigOverrides,
    studioHash,
  };
}
