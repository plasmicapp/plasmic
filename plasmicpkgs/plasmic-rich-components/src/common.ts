import React from "react";
import { tinycolor } from "@ctrl/tinycolor";

export function useIsClient() {
  const [loaded, setLoaded] = React.useState(false);
  useIsomorphicLayoutEffect(() => {
    setLoaded(true);
  });
  return loaded;
}

const isBrowser = typeof window !== "undefined";
export const useIsomorphicLayoutEffect = isBrowser
  ? React.useLayoutEffect
  : React.useEffect;

export function capitalize(text: string) {
  return text.slice(0, 1).toUpperCase() + text.slice(1);
}

export function isLight(color: string) {
  const { r, g, b } = tinycolor(color).toRgb();
  return r * 0.299 + g * 0.587 + b * 0.114 > 186;
}
