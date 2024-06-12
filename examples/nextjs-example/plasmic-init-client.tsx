"use client";

import { CodeComponent } from "@/components/CodeComponent";
import { PLASMIC } from "@/plasmic-init";
import { PlasmicRootProvider } from "@plasmicapp/loader-nextjs";
import React from "react";

// You can register any code components that you want to use here; see
// https://docs.plasmic.app/learn/code-components-ref/
// And configure your Plasmic project to use the host url pointing at
// the /plasmic-host page of your nextjs app (for example,
// http://localhost:3000/plasmic-host).  See
// https://docs.plasmic.app/learn/app-hosting/#set-a-plasmic-project-to-use-your-app-host

PLASMIC.registerComponent(CodeComponent, {
  name: "My Code Component",
  props: {
    children: "slot",
  },
  section: "Example components",
  thumbnailUrl:
    "https://site-assets.plasmic.app/744209a6041e927f550afff230a012f5.svg",
});

/**
 * PlasmicClientRootProvider is a Client Component that passes in the loader for you.
 *
 * Why? Props passed from Server to Client Components must be serializable.
 * https://beta.nextjs.org/docs/rendering/server-and-client-components#passing-props-from-server-to-client-components-serialization
 * However, PlasmicRootProvider requires a loader, but the loader is NOT serializable.
 *
 * In a Server Component like app/<your-path>/path.tsx, rendering the following would not work:
 *
 * ```tsx
 * import { PLASMIC } from "@/plasmic-init";
 * import { PlasmicRootProvider } from "plasmicapp/loader-nextjs";
 * export default function MyPage() {
 *   const prefetchedData = await PLASMIC.fetchComponentData("YourPage");
 *   return (
 *     <PlasmicRootProvider
 *       loader={PLASMIC} // ERROR: loader is not serializable
 *       prefetchedData={prefetchedData}
 *     >
 *       {yourContent()}
 *     </PlasmicRootProvider>;
 *   );
 * }
 * ```
 *
 * Therefore, we define PlasmicClientRootProvider as a Client Component (this file is marked "use client").
 * PlasmicClientRootProvider wraps the PlasmicRootProvider and passes in the loader for you,
 * while allowing your Server Component to pass in prefetched data and other serializable props:
 *
 * ```tsx
 * import { PLASMIC } from "@/plasmic-init";
 * import { PlasmicClientRootProvider } from "@/plasmic-init-client"; // changed
 * export default function MyPage() {
 *   const prefetchedData = await PLASMIC.fetchComponentData("YourPage");
 *   return (
 *     <PlasmicClientRootProvider // don't pass in loader
 *       prefetchedData={prefetchedData}
 *     >
 *       {yourContent()}
 *     </PlasmicClientRootProvider>;
 *   );
 * }
 * ```
 */
export function PlasmicClientRootProvider(
  props: Omit<React.ComponentProps<typeof PlasmicRootProvider>, "loader">
) {
  return (
    <PlasmicRootProvider loader={PLASMIC} {...props}></PlasmicRootProvider>
  );
}
