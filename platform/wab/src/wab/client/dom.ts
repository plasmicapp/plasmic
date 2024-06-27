import { getElementBounds } from "@/wab/client/dom-utils";
import {
  coalesce,
  ensure,
  isHTMLElt,
  maybe,
  parsePx,
  tuple,
} from "@/wab/shared/common";
import { Box, ClientRect, Pt } from "@/wab/shared/geom";
import * as Immutable from "immutable";
import $ from "jquery";

export interface NodeAndOffset {
  node: Element;
  offset: number;
}

export function range(
  doc: Document,
  start?: NodeAndOffset,
  end?: NodeAndOffset
) {
  const sel = ensure(doc.getSelection());
  if (sel.rangeCount === 0) {
    return null;
  }
  const rng = sel.getRangeAt(0);
  if (start) {
    if (end == null) {
      end = start;
    }
    rng.setStart(start.node, start.offset);
    rng.setEnd(end.node, end.offset);
    sel.removeAllRanges();
    sel.addRange(rng);
  }
  return rng;
}

export const clearRange = (doc: /*TWZ*/ HTMLDocument) => {
  const sel = doc.getSelection();
  if (sel) {
    sel.removeAllRanges();
  }
};

export function* ancestors(x: JQuery, excludeSelf = false) {
  let cur = x;
  while (cur.length > 0) {
    if (!(cur === x && excludeSelf)) {
      yield cur;
    }
    cur = cur.parent();
  }
}

/**
 * Crawls the tree using breadth-first search
 * `stack` is not used but this is capable of yielding the path from root to each node.
 * NOTE: JQuery 3.5+ will apply an HTML pre-filter for self-closing tags (<div/> to <div></div>)
 *  and this may not always behave the way you expect.
 *  See https://jquery.com/upgrade-guide/3.5/ for more details.
 **/

export function* bfs($elt: JQuery, excludeSelf = false) {
  const q = Immutable.List<[any[], any[]]>().asMutable();
  q.push(tuple([], [$elt]));
  while (!q.isEmpty()) {
    const [stack, xs] = ensure(
      q.first(),
      "Nonempty queue must have first element"
    );
    q.shift();
    for (const x of [...xs]) {
      if (!($elt === x && excludeSelf)) {
        yield x;
      }
      q.push(
        tuple(
          stack.concat([x]),
          Array.from(x.children()).map((c) => $(c as any))
        )
      );
    }
  }
}

export function tag(x) {
  let left;
  return coalesce(
    maybe(x.get(0).tagName, (x1) => x1.toLowerCase()),
    () => ""
  );
}

// Returns the caret (cursor) position of the specified text field.
// Return value range is 0-elt.value.length.
// From <http://stackoverflow.com/questions/2897155/get-cursor-position-within-an-text-input-field>
export function getCaretPos(doc, elt) {
  // IE support
  if (doc.selection) {
    // Set focus on the element
    elt.focus();
    // To get cursor position, get empty selection range
    const sel = doc.selection.createRange();
    // Move selection start to 0 position
    sel.moveStart("character", -elt.value.length);
    // The caret position is selection length
    return sel.text.length;
  } else if (elt.selectionStart || elt.selectionStart === "0") {
    return elt.selectionStart;
  } else {
    throw new Error("cannot get caret pos in input");
  }
}

/**
 * Whether something has any layout box.
 *
 * Emulates jQuery 3's behavior.
 * See
 * https://github.com/jquery/jquery/blob/e743cbd28553267f955f71ea7248377915613fd9/src/css/hiddenVisibleSelectors.js#L12
 */
export function hasLayoutBox(elem: HTMLElement) {
  return !!(
    elem.offsetWidth ||
    elem.offsetHeight ||
    elem.getClientRects().length
  );
}

export const positionedValues = new Set([
  "absolute",
  "fixed",
  "relative",
  "sticky",
]);

export const slottedPositionedValues = new Set(["static", "relative"]);

/**
 * Returns a ClientRect but where the offsets are relative to the page and not
 * the viewport.
 */
export function getRect(elt: Element): ClientRect {
  const { width, height } = elt.getBoundingClientRect();
  const { top, left } = ensure($(elt).offset());
  return {
    top,
    left,
    width,
    height,
    bottom: top + height,
    right: left + width,
  };
}

export const isWrappedFlexItem = (elt: Element) => {
  if (!elt.parentElement || !isHTMLElt(elt.parentElement)) {
    return false;
  }
  const parent = elt.parentElement;
  return parent.classList.contains("__wab_flex-item");
};

/**
 * Returns a ClientRect but where right/bottom are the distances from the offset
 * parent's right/bottom, respectively.  Specifically, it's the distance from
 * the edge of the offset parent's padding box (same as the CSS right/bottom properties on absolute positioned elements).
 *
 * See <https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#Identifying_the_containing_block>.
 */
export function getOffsetRectOfHTMLElement(elt: HTMLElement): ClientRect {
  if (isWrappedFlexItem(elt)) {
    return getOffsetRectOfHTMLElement(ensure(elt.parentElement));
  }
  const {
    offsetWidth: width,
    offsetHeight: height,
    offsetTop: top,
    offsetLeft: left,
    offsetParent,
  } = elt;

  /**
   * In case we are dealing with an element that has `position: fixed` we aren't going to be able to
   * access offsetParent, since null is returned, but if we know that we are dealing with a fixed
   * element, the parentElement is going to be the initial containing block, knowing this we can
   * access the parentElemnt to get `containerWidth` and `containerHeight` that is required.
   *
   * TODO: Does this generate an position offset error by 1 in any case ???
   *
   * See: <https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent>
   *     <https://developer.mozilla.org/en-US/docs/Web/CSS/position>
   */
  let containerWidth: number | undefined;
  let containerHeight: number | undefined;

  if (!offsetParent) {
    containerWidth = ensure(ensure(elt.parentElement).offsetWidth);
    containerHeight = ensure(ensure(elt.parentElement).offsetHeight);
  } else {
    containerWidth = ensure($(ensure(offsetParent)).innerWidth());
    containerHeight = ensure($(ensure(offsetParent)).innerHeight());
  }

  const [bottom, right] = [
    containerHeight - top - height,
    containerWidth - left - width,
  ];
  return {
    top,
    left,
    width,
    height,
    bottom,
    right,
  };
}

export function getOffsetRect(elt: Element): ClientRect {
  if (isHTMLElt(elt)) {
    return getOffsetRectOfHTMLElement(elt);
  }
  const bb = elt.getBoundingClientRect();

  const offsetParent = getEffectiveOffsetParent(elt);
  const parentBB = offsetParent?.getBoundingClientRect();
  const parentStyle = offsetParent && getComputedStyle(offsetParent);

  return {
    top:
      (parentBB &&
        parentStyle &&
        bb.top - parentBB.top - parsePx(ensure(parentStyle.borderLeftWidth))) ??
      0,
    left:
      (parentBB &&
        parentStyle &&
        bb.left -
          parentBB.left -
          parsePx(ensure(parentStyle.borderTopWidth))) ??
      0,
    width: bb.width,
    height: bb.height,
    bottom:
      (parentBB &&
        parentStyle &&
        parentBB.bottom -
          bb.bottom -
          parsePx(ensure(parentStyle.borderBottomWidth))) ??
      0,
    right:
      (parentBB &&
        parentStyle &&
        parentBB.right -
          bb.right -
          parsePx(ensure(parentStyle.borderRightWidth))) ??
      0,
  };
}

export function getEffectiveOffsetParent(domElt: Element): Element | null {
  if (isWrappedFlexItem(domElt)) {
    return getEffectiveOffsetParent(ensure(domElt.parentElement));
  }
  if (isHTMLElt(domElt)) {
    return domElt.offsetParent;
  }
  if (isHTMLElt(domElt.parentElement)) {
    return domElt.parentElement;
  }
  return null;
}

export function getOffsetPoint(domElt: Element) {
  if (isHTMLElt(domElt)) {
    return new Pt(domElt.offsetLeft, domElt.offsetTop);
  }
  const rect = getOffsetRect(domElt);
  return new Pt(rect.left, rect.top);
}

/**
 * Like getRect but excludes borders (includes just padding).
 */
export function getPaddingRect(elt: HTMLElement): ClientRect {
  const rect = getElementBounds($(elt));
  const sty = getComputedStyle(elt);
  return {
    top: rect.top + parsePx(ensure(sty.borderTopWidth)),
    left: rect.left + parsePx(ensure(sty.borderLeftWidth)),
    width: elt.clientWidth,
    height: elt.clientHeight,
    bottom: rect.top + rect.height - parsePx(ensure(sty.borderBottomWidth)),
    right: rect.left + rect.width - parsePx(ensure(sty.borderRightWidth)),
  };
}

export function getElementBoundCssProps(node: HTMLElement) {
  const sty = getComputedStyle(node);
  const padding = {
    left: parsePx(sty.paddingLeft || "0px"),
    top: parsePx(sty.paddingTop || "0px"),
    right: parsePx(sty.paddingRight || "0px"),
    bottom: parsePx(sty.paddingBottom || "0px"),
  };
  const border = {
    left: parsePx(sty.borderLeftWidth || "0px"),
    top: parsePx(sty.borderTopWidth || "0px"),
    right: parsePx(sty.borderRightWidth || "0px"),
    bottom: parsePx(sty.borderBottomWidth || "0px"),
  };
  const margin = {
    left: parsePx(sty.marginLeft || "0px"),
    top: parsePx(sty.marginTop || "0px"),
    right: parsePx(sty.marginRight || "0px"),
    bottom: parsePx(sty.marginBottom || "0px"),
  };
  return {
    padding,
    border,
    margin,
  };
}

export function getMarginRect(node: HTMLElement): DOMRect {
  const { margin, border } = getElementBoundCssProps(node);
  const rect = getElementBounds(node);
  return new DOMRect(
    rect.left,
    rect.top,
    rect.width + margin.left + margin.right + border.left + border.right,
    rect.height + margin.top + margin.bottom + border.top + border.bottom
  );
}

export function getContentOnlyRect(
  elt: JQuery<HTMLElement>,
  opts: {
    origin?: {
      top: number;
      left: number;
    };
  } = {}
): DOMRect {
  const node = $(elt).get(0);
  const rect = getElementBounds(elt);
  const originTop = opts.origin ? opts.origin.top : rect.top;
  const originLeft = opts.origin ? opts.origin.left : rect.left;

  const { padding, border } = getElementBoundCssProps(node);
  const width =
    node.clientWidth -
    padding.left -
    padding.right -
    border.left -
    border.right;
  const height =
    node.clientHeight -
    padding.top -
    padding.bottom -
    border.top -
    border.bottom;
  const top = originTop + padding.top + border.top;
  const left = originLeft + padding.left + border.left;
  return new DOMRect(left, top, width, height);
}

export function getBoundingClientRect(...elts: Element[]): ClientRect {
  return ensure(
    Box.mergeBBs(elts.map((x) => x.getBoundingClientRect()))
  ).rect();
}

export function isArrowKey(key: string) {
  return ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key);
}
