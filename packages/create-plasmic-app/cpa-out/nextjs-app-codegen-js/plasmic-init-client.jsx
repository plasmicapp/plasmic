"use client";

import * as React from "react";
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import Link from "next/link";

/**
 * ClientPlasmicRootProvider is a Client Component that passes Next's Link to PlasmicRootProvider.
 *
 * Props passed from a Server Component to a Client Component must be serializable.
 * https://nextjs.org/docs/app/getting-started/server-and-client-components#passing-data-from-server-to-client-components
 */
export function ClientPlasmicRootProvider(
  props
) {
  return <PlasmicRootProvider Link={Link} {...props} />;
}
