import React from "react";
import {
  NO_INDEX_COPY,
  plasmicClonedIndex,
} from "../../../shared/canvas-constants";

export type RepeatedElementFnType = <
  T extends React.ReactElement | React.ReactElement[]
>(
  cloneIndex: boolean | number,
  e: T
) => T;

export function genRepeatedElement(react: typeof React) {
  const repeatedElement: RepeatedElementFnType = (cloneIndex, e) => {
    if (Array.isArray(e)) {
      return e.map((e2) => repeatedElement(cloneIndex, e2));
    }

    if (!e || !react.isValidElement<any>(e) || typeof e === "string") {
      // Not a JSX element
      return e;
    }

    return react.cloneElement(e, {
      [plasmicClonedIndex]:
        typeof cloneIndex === "number"
          ? cloneIndex
          : cloneIndex
          ? 0
          : NO_INDEX_COPY,
    }) as any;
  };
  return repeatedElement;
}
