import React from "react";

export function useIsClient() {
  const [loaded, setLoaded] = React.useState(false);
  useIsomorphicLayoutEffect(() => {
    setLoaded(true);
  });
  return loaded;
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const isBrowser = typeof window !== "undefined";
export const useIsomorphicLayoutEffect = isBrowser
  ? React.useLayoutEffect
  : React.useEffect;
