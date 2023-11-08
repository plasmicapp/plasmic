import { $, JQ } from "../../../../deps";
import { Box, Pt } from "../../../../geom";
import { ensureNonEmpty } from "../../../../common";
import { hasLayoutBox } from "../../../../dom";
import { getElementBounds } from "../../../dom-utils";

export function recomputeBounds($node: JQ): Box {
  const nodes: HTMLElement[] = $node.toArray();
  const dims = ensureNonEmpty(
    nodes
      .filter(hasLayoutBox)
      .map((node: HTMLElement) => $(node))
      .map(getElementBounds)
  );
  // Round the offset, which is how Chrome render by default.
  const nodesOffsetFromInnerDocument = Pt.fromOffset({
    left: Math.min(...dims.map((d) => d.left)),
    top: Math.min(...dims.map((d) => d.top)),
  }).toOffset();

  const right = Math.max(...dims.map((d) => d.left + d.width));
  const bottom = Math.max(...dims.map((d) => d.top + d.height));
  const width = right - nodesOffsetFromInnerDocument.left;
  const height = bottom - nodesOffsetFromInnerDocument.top;
  return new Box(
    nodesOffsetFromInnerDocument.top,
    nodesOffsetFromInnerDocument.left,
    width,
    height
  );
}
