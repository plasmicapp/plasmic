import { WIElement, WIVariantSettings } from "@/wab/client/web-importer/types";
import { toVarName } from "@/wab/shared/codegen/util";
import { isLiteralObject } from "@/wab/shared/common";
import { fixJson } from "@/wab/shared/copilot/fix-json";

/**
 * Parses a plasmic-component element into a WIElement.
 *
 * The plasmic-component format:
 * <plasmic-component
 *   data-plasmic-component="ComponentName"
 *   data-props='{"label":"Click me","disabled":false}'
 *
 *   <div slot="slotName">
 *     Slot content here
 *   </div>
 * </plasmic-component>
 *
 * - data-plasmic-component: identifies which component to instantiate (case-sensitive, must exactly match component name)
 * - data-plasmic-name: optional, names the TplComponent instance in the element tree
 * - data-props: JSON-stringified object of all component props. Using a single attribute
 *   preserves camelCase prop names (individual data-prop-* attributes get lowercased by DOMParser).
 * - slot attribute on children: identifies which slot the child fills
 * - style attribute: handled separately via addSelfStyleRule()
 *
 * @param elt - The plasmic-component HTMLElement to parse
 * @param variantSettings - Pre-computed variant settings for styling
 * @param rec - Recursive function to parse child elements
 * @returns WIElement representing the component, or null if invalid
 */
export function parseComponent(
  elt: HTMLElement,
  variantSettings: WIVariantSettings[],
  attrs: Record<string, string>,
  rec: (node: Node) => WIElement | null
): WIElement | null {
  const tag = elt.tagName.toLowerCase();

  // Extract component name from data-plasmic-component attribute
  // Returns the value as-is, preserving the original casing for exact matching
  // e.g., data-plasmic-component="Button" -> "Button"
  // e.g., data-plasmic-component="Text Field" -> "Text Field"
  const componentName = attrs["data-plasmic-component"];
  if (!componentName) {
    return null;
  }

  const slots: Record<string, WIElement[]> = {};

  const dataProps = attrs["data-props"];
  let props: Record<string, any> = {};

  if (dataProps) {
    const parsed = JSON.parse(fixJson(dataProps));

    if (!isLiteralObject(parsed)) {
      throw new Error(
        `Component "${componentName}" data-props must be a JSON object, got: ${dataProps}`
      );
    }

    props = Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [toVarName(key), value])
    );
  }

  for (const child of Array.from(elt.children)) {
    if (child instanceof HTMLElement) {
      const slotName = child.getAttribute("slot");
      if (slotName) {
        const slotChildren: WIElement[] = [];
        for (const slotChild of Array.from(child.childNodes)) {
          const wiChild = rec(slotChild);
          if (wiChild) {
            slotChildren.push(wiChild);
          }
        }
        slots[toVarName(slotName)] = slotChildren;
      }
    }
  }

  return {
    type: "component",
    tag,
    component: componentName,
    props,
    slots,
    attrs,
    variantSettings,
  };
}
