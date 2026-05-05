import { ifTs } from "../../../utils/file-utils";
import { JsOrTs } from "../../../utils/types";

export function makePlasmicInitClient_app_codegen(jsOrTs: JsOrTs): string {
  return `"use client";

import * as React from "react";
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import Link from "next/link";

/**
 * ClientPlasmicRootProvider is a Client Component that passes Next's Link to PlasmicRootProvider.
 *
 * Props passed from a Server Component to a Client Component must be serializable.
 * https://nextjs.org/docs/app/getting-started/server-and-client-components#passing-data-from-server-to-client-components
 *
 * We define ClientPlasmicRootProvider as a Client Component (this file is marked "use client").
 * ClientPlasmicRootProvider wraps PlasmicRootProvider and passes Link, while allowing
 * your Server Component to pass in serializable props:
 *
 * \`\`\`tsx
 * import { ClientPlasmicRootProvider } from "@/plasmic-init-client";
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <ClientPlasmicRootProvider>{children}</ClientPlasmicRootProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * \`\`\`
 */
export function ClientPlasmicRootProvider(
  props${ifTs(
    jsOrTs,
    ': Omit<React.ComponentProps<typeof PlasmicRootProvider>, "Link">'
  )}
) {
  return <PlasmicRootProvider Link={Link} {...props} />;
}
`;
}
