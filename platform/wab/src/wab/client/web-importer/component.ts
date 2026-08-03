import { WIError } from "@/wab/client/web-importer/errors";
import {
  WIComponent,
  WIElement,
  WIVariantSettings,
} from "@/wab/client/web-importer/types";
import { toVarName } from "@/wab/shared/codegen/util";
import { isLiteralObject } from "@/wab/shared/common";
import { fixJson } from "@/wab/shared/copilot/fix-json";
import { Result, err, ok } from "neverthrow";

/**
 * Parses a plasmic-component element into a WIComponent.
 *
 * The plasmic-component format:
 * <plasmic-component
 *   data-plasmic-component="ComponentName"
 *   data-props='{"label":"Click me","disabled":false}'
 *
 *   <slot name="slotName">
 *     Slot content here
 *   </slot>
 * </plasmic-component>
 *
 * - data-plasmic-component: identifies which component to instantiate (case-sensitive, must exactly match component name)
 * - data-plasmic-project: optional, the projectId of the imported project dependency the component comes from.
 * - data-plasmic-name: optional, names the TplComponent instance in the element tree
 * - data-props: JSON-stringified object of all component props. Using a single attribute
 *   preserves camelCase prop names (individual data-prop-* attributes get lowercased by DOMParser).
 * - slot fills: <slot name="slotName"> children; the wrapper element itself
 *   is discarded and its children become the slot content.
 * - style attribute: handled separately via addSelfStyleRule()
 *
 * Failure semantics:
 * - Missing data-plasmic-component: the instance has no identity, so this is an Err and the caller skips the element.
 * - Invalid data-props: the instance identity is intact, so the component is still returned with `props: {}`
 *   and the problem is pushed onto `errors` for the report.
 *
 * @param elt - The plasmic-component HTMLElement to parse
 * @param variantSettings - Pre-computed variant settings for styling
 * @param rec - Recursive function to parse child elements
 * @param path - Locator of `elt` in the pasted HTML, used to anchor WIErrors
 * @param errors - List of recoverable errors found while parsing
 */
export function parseComponent(
  elt: HTMLElement,
  variantSettings: WIVariantSettings[],
  attrs: Record<string, string>,
  rec: (node: Node) => WIElement | null,
  path: string,
  errors: WIError[]
): Result<WIComponent, WIError> {
  const tag = elt.tagName.toLowerCase();

  // Extract component name from data-plasmic-component attribute
  // Returns the value as-is, preserving the original casing for exact matching
  // e.g., data-plasmic-component="Button" -> "Button"
  // e.g., data-plasmic-component="Text Field" -> "Text Field"
  const componentName = attrs["data-plasmic-component"];
  if (!componentName) {
    return err({
      code: "invalid-component-instance",
      path,
      reason: 'missing "data-plasmic-component" attribute',
    });
  }

  const depProjectId = attrs["data-plasmic-project"] || undefined;

  const slots: Record<string, WIElement[]> = {};

  const dataProps = attrs["data-props"];
  let props: Record<string, any> = {};

  if (dataProps) {
    const parsedResult = Result.fromThrowable(
      () => JSON.parse(fixJson(dataProps)) as unknown,
      (e): WIError => ({
        code: "invalid-data-props",
        path,
        component: componentName,
        reason: `data-props is not valid JSON (${
          e instanceof Error ? e.message : String(e)
        })`,
      })
    )();

    if (parsedResult.isErr()) {
      errors.push(parsedResult.error);
    } else if (!isLiteralObject(parsedResult.value)) {
      const value = parsedResult.value;
      const gotType =
        value === null
          ? "null"
          : Array.isArray(value)
          ? "an array"
          : `a ${typeof value}`;
      errors.push({
        code: "invalid-data-props",
        path,
        component: componentName,
        reason: `data-props must be a JSON object, got ${gotType}`,
      });
    } else {
      props = Object.fromEntries(
        Object.entries(parsedResult.value).map(([key, value]) => [
          toVarName(key),
          value,
        ])
      );
    }
  }

  for (const child of Array.from(elt.children)) {
    if (child instanceof HTMLElement) {
      const childTag = child.tagName.toLowerCase();
      if (childTag === "slot-target") {
        errors.push({
          code: "invalid-slot-target",
          path,
          reason: `a <slot-target> child defines a slot in a component's own tree; to fill this instance's slot, use <slot name="...">`,
        });
        continue;
      }
      if (childTag !== "slot") {
        const attrSlotName = child.getAttribute("slot");
        if (attrSlotName) {
          errors.push({
            code: "invalid-slot",
            path,
            reason: `filling a slot via the slot attribute is not supported; use a <slot name="${attrSlotName}"> child instead`,
          });
        }
        continue;
      }
      const slotName = child.getAttribute("name");
      if (!slotName) {
        errors.push({
          code: "invalid-slot",
          path,
          reason: `a <slot> child is missing its "name" attribute`,
        });
        continue;
      }
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

  return ok({
    type: "component",
    tag,
    path,
    component: componentName,
    ...(depProjectId && { depProjectId }),
    props,
    slots,
    attrs,
    variantSettings,
  });
}
