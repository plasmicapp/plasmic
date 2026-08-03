import * as React from "react";

/**
 * Element width via ResizeObserver. Returns undefined when the element is
 * absent or `enabled` is false.
 */
export function useElementWidth(
  element: HTMLElement | null,
  { enabled = true }: { enabled?: boolean } = {}
): number | undefined {
  const [width, setWidth] = React.useState<number | undefined>(undefined);
  React.useEffect(() => {
    if (!enabled || !element) {
      setWidth(undefined);
      return;
    }
    const update = () => setWidth(element.offsetWidth || undefined);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, element]);
  return width;
}
