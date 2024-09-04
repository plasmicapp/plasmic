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

// Polyfill for React.useId
// https://github.com/reactwg/react-18/discussions/111#discussioncomment-1517837
let __globalId = 0;
export const useId: () => string =
  (React as any).useId ?? (() => React.useState(() => "" + __globalId++));
