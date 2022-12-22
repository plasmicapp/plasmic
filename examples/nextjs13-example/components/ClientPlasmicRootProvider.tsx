"use client";

import { PlasmicRootProvider } from "@plasmicapp/loader-nextjs";
import { PLASMIC } from "plasmic-init";

/**
 * Props passed from Server to Client Components must be serializable.
 * https://beta.nextjs.org/docs/rendering/server-and-client-components#passing-props-from-server-to-client-components-serialization
 *
 * PlasmicRootProvider requires a loader which is not serializable.
 * To work around this issue, we create a wrapper "use client" file that references the "client" loader
 * instead of "server" loader.
 * @param props
 * @constructor
 */
export function ClientPlasmicRootProvider(
  props: Omit<React.ComponentProps<typeof PlasmicRootProvider>, "loader">
) {
  return (
    <PlasmicRootProvider loader={PLASMIC} {...props}></PlasmicRootProvider>
  );
}
