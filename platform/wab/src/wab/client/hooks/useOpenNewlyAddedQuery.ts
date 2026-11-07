import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { autorun } from "mobx";
import React from "react";

/** Calls `open` once for the query just added via `studioCtx.newlyAddedQuery`. */
export function useOpenNewlyAddedQuery(
  studioCtx: StudioCtx,
  query: NonNullable<StudioCtx["newlyAddedQuery"]>,
  open: () => void,
) {
  React.useEffect(
    () =>
      autorun(() => {
        if (studioCtx.newlyAddedQuery === query) {
          studioCtx.newlyAddedQuery = undefined;
          open();
        }
      }),
    [query],
  );
}
