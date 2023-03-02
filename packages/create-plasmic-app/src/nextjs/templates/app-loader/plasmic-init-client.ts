import { ifTs } from "../../../utils/file-utils";
import { JsOrTs } from "../../../utils/types";

export function makePlasmicInitClient_app_loader(jsOrTs: JsOrTs): string {
  return `"use client";

import { PlasmicRootProvider } from "@plasmicapp/loader-nextjs";
import { PLASMIC } from "@/plasmic-init";

// You can register any code components that you want to use here; see
// https://docs.plasmic.app/learn/code-components-ref/
// And configure your Plasmic project to use the host url pointing at
// the /plasmic-host page of your nextjs app (for example,
// http://localhost:3000/plasmic-host).  See
// https://docs.plasmic.app/learn/app-hosting/#set-a-plasmic-project-to-use-your-app-host

// PLASMIC.registerComponent(...);

/**
 * ClientPlasmicRootProvider is a Client Component that passes in the loader for you.
 *
 * Why? Props passed from Server to Client Components must be serializable.
 * https://beta.nextjs.org/docs/rendering/server-and-client-components#passing-props-from-server-to-client-components-serialization
 * However, PlasmicRootProvider requires a loader, but the loader is NOT serializable.
 *
 * In a Server Component like app/<your-path>/path.tsx, rendering the following would not work:
 *
 * \`\`\`tsx
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
 * \`\`\`
 *
 * Therefore, we define ClientPlasmicRootProvider as a Client Component (this file is marked "use client").
 * ClientPlasmicRootProvider wraps the PlasmicRootProvider and passes in the loader for you,
 * while allowing your Server Component to pass in prefetched data and other serializable props:
 *
 * \`\`\`tsx
 * import { PLASMIC } from "@/plasmic-init";
 * import { ClientPlasmicRootProvider } from "@/plasmic-init-client"; // changed
 * export default function MyPage() {
 *   const prefetchedData = await PLASMIC.fetchComponentData("YourPage");
 *   return (
 *     <ClientPlasmicRootProvider // don't pass in loader
 *       prefetchedData={prefetchedData}
 *     >
 *       {yourContent()}
 *     </ClientPlasmicRootProvider>;
 *   );
 * }
 * \`\`\`
 */
export function ClientPlasmicRootProvider(
  props${ifTs(
    jsOrTs,
    ': Omit<React.ComponentProps<typeof PlasmicRootProvider>, "loader">'
  )}
) {
  return (
    <PlasmicRootProvider loader={PLASMIC} {...props}></PlasmicRootProvider>
  );
}
`;
}
