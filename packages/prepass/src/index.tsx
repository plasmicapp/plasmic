import {
  HeadMetadata,
  HeadMetadataContext,
  PlasmicPrepassContext,
} from "@plasmicapp/query";
import prepass, { ClientReferenceVisitor } from "@plasmicapp/react-ssr-prepass";
import React from "react";

interface PlasmicPrepassData {
  queryData: Record<string, any>;
  headMetadata: HeadMetadata;
}

/**
 * Runs prepass on the React tree and returns all data for prerendering a Plasmic page.
 */
export async function plasmicPrepassExtract(
  element: React.ReactElement,
  onClientComponentRef?: ClientReferenceVisitor
): Promise<PlasmicPrepassData> {
  const cache = new Map<string, any>();
  const headMetadata: HeadMetadata = {};
  try {
    await plasmicPrepass(
      <PlasmicPrepassContext cache={cache}>
        <HeadMetadataContext.Provider value={headMetadata}>
          {element}
        </HeadMetadataContext.Provider>
      </PlasmicPrepassContext>,
      onClientComponentRef
    );
  } catch (err) {
    console.warn(`PLASMIC: Error encountered while pre-rendering`, err);
  }

  // Ignore SWR cache keys and query taggeds with $csq$ that indicate a query that
  // the value is exected to be only loaded in client-side and not possible to
  // extract from server-side.
  const filteredCache = Object.fromEntries(
    Array.from(cache.entries()).filter(
      ([key, val]) =>
        !key.startsWith("$swr$") &&
        !key.startsWith("$csq$") &&
        val !== undefined
    )
  );

  const queryData = (() => {
    try {
      return JSON.parse(
        JSON.stringify(filteredCache, (_key, value) =>
          value !== undefined ? value : null
        )
      );
    } catch {
      return filteredCache;
    }
  })();

  return {
    queryData,
    headMetadata,
  };
}

/**
 * Runs prepass on the React tree and returns query data for prerendering a Plasmic page.
 */
export async function extractPlasmicQueryData(
  element: React.ReactElement,
  onClientComponentRef?: ClientReferenceVisitor
): Promise<Record<string, any>> {
  return (await plasmicPrepassExtract(element, onClientComponentRef)).queryData;
}

/**
 * Runs prepass on the React tree.
 */
export async function plasmicPrepass(
  element: React.ReactElement,
  onClientComponentRef?: ClientReferenceVisitor
) {
  await prepass(element, undefined, onClientComponentRef);
}
