import { DEVFLAGS } from "@/wab/shared/devflags";
import { Rect } from "@/wab/shared/geom";

export const tagHeight = 25;

/**
 * Sets the node outline to be flipped or not.
 *
 * @param $doc The canvasCtx().$doc() whose scroll position to measure.
 * @param $tagNode The node we want to flip or not.
 * @param label The tag content to set.
 * @param rect The outline's rect - offset is rel to the iframe document.
 */
export function computeNodeOutlineTagLayoutClass($doc: any, rect: Rect) {
  if (DEVFLAGS.noFlipTags) {
    return [];
  }

  // Modeled after Webflow.
  // If there's no room above the hoverbox to squeeze in the tag (or even if
  // we're just too close to the top), need to move the tag.  We move it to
  // the bottom if the element is not too tall.  If it's too tall we just flip
  // it down to be inside the hoverbox (still attached to the top).
  if (rect.top - $doc.scrollTop() < tagHeight) {
    if (rect.height > 250) {
      return ["node-outline-tag--flipped"];
    } else {
      return ["node-outline-tag--bottomed-flipped"];
    }
  }
  return [];
}
