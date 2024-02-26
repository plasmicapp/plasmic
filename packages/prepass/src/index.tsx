import { PlasmicPrepassContext } from "@plasmicapp/query";
import prepass, { ClientReferenceVisitor } from "@plasmicapp/react-ssr-prepass";
import React from "react";

export async function extractPlasmicQueryData(
  element: React.ReactElement,
  onClientComponentRef?: ClientReferenceVisitor
): Promise<Record<string, any>> {
  const cache = new Map<string, any>();
  try {
    await plasmicPrepass(
      <PlasmicPrepassContext cache={cache}>{element}</PlasmicPrepassContext>,
      onClientComponentRef
    );
  } catch (err) {
    console.warn(`PLASMIC: Error encountered while pre-rendering`, err);
  }

  // Ignore SWR cache keys and query taggeds with $csq$ that indicate a query that
  // the value is exected to be only loaded in client-side and not possible to
  // extract from server-side.
  const queryCache = Object.fromEntries(
    Array.from(cache.entries()).filter(
      ([key, val]) =>
        !key.startsWith("$swr$") &&
        !key.startsWith("$csq$") &&
        val !== undefined
    )
  );

  try {
    return JSON.parse(
      JSON.stringify(queryCache, (_key, value) =>
        value !== undefined ? value : null
      )
    );
  } catch {
    return queryCache;
  }
}

export async function plasmicPrepass(
  element: React.ReactElement,
  onClientComponentRef?: ClientReferenceVisitor
) {
  await prepass(element, undefined, onClientComponentRef);
}
