import React from "react";

/**
 * Calculates how much to shift a label to the left if it's wider than its container,
 * to prevent it from overflowing on the right side.
 */
export function useTagLeftOffset(
  tagRef: React.RefObject<HTMLElement>,
  elementWidth: number,
  zoom: number
) {
  const [leftOffset, setLeftOffset] = React.useState(0);

  React.useLayoutEffect(() => {
    if (tagRef.current) {
      const tagWidth = tagRef.current.offsetWidth;
      const scaledElementWidth = elementWidth * zoom;
      setLeftOffset(
        scaledElementWidth < tagWidth ? scaledElementWidth - tagWidth : 0
      );
    }
  }, [elementWidth, zoom, tagRef]);

  return leftOffset;
}
