import {
  isKnownNodeMarker,
  Marker,
  NodeMarker,
  RawText,
  RuleSet,
  StyleMarker,
} from "@/wab/classes";
import "@/wab/client/components/canvas/slate";
import { assert } from "@/wab/common";
import { normProp, parseCssNumericNew } from "@/wab/css";
import {
  isTagInline,
  isTagListContainer,
} from "@/wab/shared/core/rich-text-util";
import { EffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import { mkBaseVariant } from "@/wab/shared/Variants";
import * as Tpls from "@/wab/tpls";
import { mkTplTag, TplTagType } from "@/wab/tpls";
import type { Descendant } from "slate";
import { Element, Text } from "slate";

export function isExplicitlySized(effectiveVs: EffectiveVariantSetting) {
  // We need to use `getComputedStyleForVal` because this function might be
  // called without evaluating (so `node.summarizedRuleSet` would be out of
  // date). This is safe to do because we don't need Sub.mobx to track
  // sizing changes in the RuleSet - we use `ResizeObserver` to do so.

  const computedStyle = effectiveVs.rsh();
  const isExplicitSize = (size: string) =>
    size !== "" && size !== "auto" && size !== "wrap";

  const hasExplicitSize = (dim: "width" | "height") => {
    if (isExplicitSize(computedStyle.get(dim))) {
      return true;
    }

    // For width, if left and right are both explicitly specified,
    // then that also specifies a size
    if (
      dim === "width" &&
      isExplicitSize(computedStyle.get("left")) &&
      isExplicitSize(computedStyle.get("right"))
    ) {
      return true;
    }
    if (
      dim === "height" &&
      isExplicitSize(computedStyle.get("top")) &&
      isExplicitSize(computedStyle.get("bottom"))
    ) {
      return true;
    }

    return false;
  };

  return hasExplicitSize("width") && hasExplicitSize("height");
}

// nodeMarkerText is the string that replaces NodeMarkers in RawText.text.
// This value is used, for example, in tpl-tree, i.e. a text like `This is a
// <a href="...">link</a>` will be seen as `This is a {nodeMarkerText}` there.
const nodeMarkerText = "[child]";
export type ResolvedMarkers = {
  text: RawText["text"];
  markers: Marker[];
  newTpls: boolean;
};
export function resolveNodesToMarkers(
  nodes: Descendant[],
  lineBreaks: boolean
): ResolvedMarkers {
  const rawText: string[] = [];
  const markers: Marker[] = [];
  let newTpls = false;

  function addNodeMarkers(node: Descendant) {
    if (Element.isElement(node)) {
      if (node.type === "TplTag" || node.type === "TplTagExprText") {
        const baseVariant = mkBaseVariant();
        // At the moment, the only non-text TplTags allowed inside rich text
        // blocks are list containers (ol, ul).
        const opts: Partial<Tpls.MkTplTagOpts> = isTagListContainer(node.tag)
          ? {
              type: TplTagType.Other,
              styles: {
                display: "flex",
                "flex-direction": "column",
              },
            }
          : {
              type: TplTagType.Text,
            };
        newTpls = newTpls || !node.uuid;
        const tpl = mkTplTag(node.tag, [], {
          uuid: node.uuid,
          attrs: node.attributes || {},
          baseVariant,
          ...opts,
        });
        if (node.type === "TplTag") {
          const child = resolveNodesToMarkers(
            node.children,
            !isTagInline(node.tag)
          );
          if (tpl.type === TplTagType.Text) {
            tpl.vsettings[0].text = new RawText({
              text: child.text,
              markers: child.markers,
            });
          } else {
            // For non-text TplTags (lists) we just set children based in
            // the tpls in the markers.
            tpl.children = child.markers.map((m) => {
              assert(isKnownNodeMarker(m), "Unknown marker in non-text TplTag");
              return m.tpl;
            });
          }
          newTpls = newTpls || child.newTpls;
        }
        markers.push(
          new NodeMarker({
            position: rawText.join("").length,
            length: nodeMarkerText.length,
            tpl,
          })
        );
        rawText.push(nodeMarkerText);
      } else {
        return node.children.forEach((child) => addNodeMarkers(child));
      }
    }

    if (Text.isText(node)) {
      const cssRules = Object.fromEntries(
        Object.entries(node)
          .filter(([name, value]) => name !== "text" && value)
          // Rule names are kebab case
          .map(([name, value]) => [normProp(name), "" + value])
      );

      if (Object.keys(cssRules).length > 0) {
        markers.push(
          new StyleMarker({
            position: rawText.join("").length,
            rs: new RuleSet({ values: cssRules, mixins: [] }),
            length: node.text.length,
          })
        );
      }
      rawText.push(node.text);
    }
  }

  for (const node of nodes) {
    addNodeMarkers(node);
    if (lineBreaks) {
      rawText.push("\n");
    }
  }
  if (lineBreaks) {
    rawText.pop();
  }
  return { text: rawText.join(""), markers, newTpls };
}

/**
 * Resizes the placeholder element; returns true if resized, false otherwise
 */
export function resizePlaceholder(
  placeholderElt: HTMLElement,
  opts: {
    forceAutoHeight: boolean;
    isContainerSized: boolean;
  }
) {
  const { isContainerSized, forceAutoHeight } = opts;

  if (!placeholderElt.parentElement) {
    // Element has been detached
    return false;
  }
  const containerElt = placeholderElt.parentElement;

  // Unfortunately to get an accurate measurement of the container elt, we have to
  // hide the placeholder first.
  placeholderElt.style.display = "none";

  if (isContainerSized) {
    return false;
  }

  const innerElt = placeholderElt.children[0] as HTMLDivElement;
  const contentSize = getContentSize(containerElt);

  const isWidthSized = contentSize.width > 0;
  const isHeightSized = contentSize.height > 0;

  if (isWidthSized && isHeightSized && !forceAutoHeight) {
    return false;
  }

  placeholderElt.style.display = "block";

  const autoWidthCls = "__wab_placeholder__inner__autoWidth";
  const autoHeightCls = "__wab_placeholder__inner__autoHeight";
  if (!isWidthSized) {
    innerElt.classList.add(autoWidthCls);
    if (getContentSize(containerElt).width === 0) {
      // width was explicitly set to 0
      innerElt.classList.remove(autoWidthCls);
    }
  } else {
    innerElt.classList.remove(autoWidthCls);
  }

  if (!isHeightSized || forceAutoHeight) {
    innerElt.classList.add(autoHeightCls);
    if (getContentSize(containerElt).height === 0 && !forceAutoHeight) {
      // height was explicitly set to 0
      innerElt.classList.remove(autoHeightCls);
    }
  } else {
    innerElt.classList.remove(autoHeightCls);
  }
  return true;
}

function getContentSize(elt: HTMLElement) {
  const style = getComputedStyle(elt);

  function parsePx(val: string) {
    const res = parseCssNumericNew(val || "");
    if (res) {
      return res.num;
    } else {
      return 0;
    }
  }

  return {
    width:
      elt.clientWidth -
      parsePx(style.paddingLeft) -
      parsePx(style.paddingRight),
    height:
      elt.clientHeight -
      parsePx(style.paddingTop) -
      parsePx(style.paddingBottom),
  };
}
