import { useEffect, useMemo } from "react";

/**
 * Creates a div element on document body (or any other explicitly
 * given parent) that can be used to render portals in.
 *
 * @param parent Optional parent element (defaults to document.body)
 */
export function usePortalContainer(parent: HTMLElement = document.body) {
  const container = useMemo(() => {
    const _container = document.createElement("div");
    parent.appendChild(_container);
    return _container;
  }, []);

  useEffect(
    () => () => {
      try {
        parent.removeChild(container);
      } catch (_) {}
    },
    []
  );

  return container;
}
