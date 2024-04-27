import { isKnownRawText, isKnownRenderExpr } from "@/wab/classes";
/**
 * This is an initial version of a public API for consuming Plasmic design structures.
 *
 * It is intentionally starting scrappy, to serve as an MVP to iterate on the SDUI use case (server-driven UIs).
 * This is where users want to use Plasmic less for crafting arbitrary HTML/CSS, and more for visually dragging and dropping their existing components, and then owning the rendering this within their choice of target platform.
 * This target platform could be things currently far outside the scope of what Plasmic targets, such as mobile native.
 *
 * This initial cut is intended to be deprecated before long, and serves mainly as a vehicle to iterate with initial customers (IBM, Computer Universe, and others).
 * We only handle components, stacks of components (not specifying layout), and rich text.
 *
 * What we ignore:
 *
 * - HTML tags
 * - Layout and styling
 * - Images (for now, this could be easily added to this version)
 * - Data bindings/dynamic values
 */

import { NodeMarker, RuleSet, StyleMarker, TplNode } from "@/wab/classes";
import { ensureType, switchType, tuple, withoutNils } from "@/wab/common";
import { tryExtractJson } from "@/wab/exprs";
import {
  NodeMarkerElement,
  PlasmicElement,
  StyleMarkerElement,
} from "@/wab/shared/element-repr/element-repr-v2";
import { RuleSetHelpers } from "@/wab/shared/RuleSetHelpers";
import { tryGetBaseVariantSetting } from "@/wab/shared/Variants";
import { isTplComponent, isTplContainer, isTplTextBlock } from "@/wab/tpls";

const rulesetToStyles = (rs: RuleSet) => {
  const rsh = new RuleSetHelpers(rs, "div");
  return Object.fromEntries(rsh.props().map((p) => tuple(p, rsh.get(p))));
};

export function tplToPlasmicElements(tpl: TplNode): PlasmicElement | undefined {
  if (isTplContainer(tpl)) {
    return ensureType<PlasmicElement>({
      type: "box",
      children: withoutNils(
        tpl.children.map((child) => tplToPlasmicElements(child))
      ),
    });
  }
  if (isTplComponent(tpl)) {
    return {
      type: "component",
      name: tpl.component.name,
      props: Object.fromEntries(
        tpl.vsettings[0].args.map((arg) =>
          tuple(
            arg.param.variable.name,
            isKnownRenderExpr(arg.expr)
              ? arg.expr.tpl.map((child) => tplToPlasmicElements(child))
              : tryExtractJson(arg.expr)
          )
        )
      ),
    };
  }
  if (isTplTextBlock(tpl)) {
    const text = tryGetBaseVariantSetting(tpl)?.text;
    if (isKnownRawText(text)) {
      return {
        type: "text",
        value: text.text,
        ...(text.markers.length === 0
          ? {}
          : {
              markers: withoutNils(
                text.markers.map((marker) =>
                  switchType(marker)
                    .when(StyleMarker, (sm) =>
                      ensureType<StyleMarkerElement>({
                        type: "style",
                        position: sm.position,
                        length: sm.length,
                        styles: rulesetToStyles(sm.rs),
                      })
                    )
                    .when(NodeMarker, (nm) => {
                      const elt = tplToPlasmicElements(nm.tpl);
                      if (!elt) {
                        return undefined;
                      }
                      return ensureType<NodeMarkerElement>({
                        type: "node",
                        position: nm.position,
                        length: nm.length,
                        value: elt,
                      });
                    })
                    .result()
                )
              ),
            }),
      };
    } else {
      return {
        type: "text",
        value: "",
      };
    }
  }
  return undefined;
}
