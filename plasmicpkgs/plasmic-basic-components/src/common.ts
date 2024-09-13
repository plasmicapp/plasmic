import React from "react";

export const tuple = <T extends any[]>(...args: T): T => args;

export function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}

export const isBrowser = typeof window !== "undefined";

export const useIsomorphicLayoutEffect = isBrowser
  ? React.useLayoutEffect
  : React.useEffect;

export function useFirstRender() {
  const ref = React.useRef(true);
  const firstRender = ref.current;
  ref.current = false;
  return firstRender;
}

// Fix for React.useId type since it's only available for React 18+
export const useId: (() => string) | undefined = React.useId;
