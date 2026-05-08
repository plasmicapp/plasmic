import { ifTs } from "../../../utils/file-utils";
import { JsOrTs } from "../../../utils/types";

export function makePlasmicInitClient_app_codegen(jsOrTs: JsOrTs): string {
  return `"use client";

${ifTs(
  jsOrTs,
  'import type * as React from "react";\n'
)}import { PlasmicRootProvider } from "@plasmicapp/react-web";
import Link from "next/link";

/**
 * ClientPlasmicRootProvider is a Client Component that passes Next's Link to PlasmicRootProvider.
 *
 * Props passed from a Server Component to a Client Component must be serializable.
 * https://nextjs.org/docs/app/getting-started/server-and-client-components#passing-data-from-server-to-client-components
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
