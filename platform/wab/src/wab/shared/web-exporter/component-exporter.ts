import { isSlot } from "@/wab/shared/SlotUtils";
import {
  isStandaloneVariantGroup,
  tryGetBaseVariantSetting,
  tryGetVariantSetting,
} from "@/wab/shared/Variants";
import { paramToVarName, toVarName } from "@/wab/shared/codegen/util";
import { assert, switchType } from "@/wab/shared/common";
import { tryExtractJson } from "@/wab/shared/core/exprs";
import {
  flattenTpls,
  isTplTextBlock,
  tplChildren,
} from "@/wab/shared/core/tpls";
import {
  Component,
  Expr,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Variant,
  isKnownChoice,
  isKnownImageAssetRef,
  isKnownPropParam,
  isKnownRawText,
  isKnownRenderExpr,
  isKnownStyleTokenRef,
} from "@/wab/shared/model/classes";
import {
  isAnyType,
  isBoolType,
  isNumType,
} from "@/wab/shared/model/model-util";
import {
  XmlAttrs,
  XmlElement,
  toXml,
} from "@/wab/shared/web-exporter/xml-utils";

/**
 * Serializes a Tpl tree to indented XML format.
 */
export function serializeTpl(tpl: TplNode): string {
  return toXml(buildTplNode(tpl));
}

function buildTplNode(tpl: TplNode): XmlElement {
  return switchType(tpl)
    .when(TplTag, (tag) => buildTplTag(tag))
    .when(TplComponent, (comp) => buildTplComponent(comp))
    .when(TplSlot, (slot) => buildTplSlot(slot))
    .result();
}

/**
 * Extracts a string representation from supported expression types.
 * Uses the existing tryExtractJson utility which handles:
 * - CustomCode: JSON literals (strings, numbers, booleans, objects, arrays)
 * - TemplatedString: Simple static strings
 * - CompositeExpr: Composite JSON objects with static substitutions
 * - ImageAssetRef: Asset dataUri
 * - StyleTokenRef: Token UUID
 *
 * Returns empty string for dynamic expressions (ObjectPath, VarRef, EventHandler, etc.)
 * that can't be serialized to static HTML.
 */
function extractExprValue(expr: Expr): string {
  // First try to extract as JSON (handles CustomCode, TemplatedString, CompositeExpr)
  const jsonValue = tryExtractJson(expr);
  if (jsonValue !== undefined) {
    return typeof jsonValue === "string"
      ? jsonValue
      : JSON.stringify(jsonValue);
  }

  // Handle asset references
  if (isKnownImageAssetRef(expr)) {
    return expr.asset.dataUri || "";
  }

  // Handle style token references
  if (isKnownStyleTokenRef(expr)) {
    return expr.token.uuid;
  }

  // For dynamic expressions (ObjectPath, VarRef, EventHandler, RenderExpr, etc.),
  // we can't serialize them to static HTML, so return empty string
  return "";
}

function getStyleString(vs: any): string | undefined {
  if (!vs?.rs?.values) {
    return undefined;
  }
  const styleProps: string[] = [];
  for (const [prop, value] of Object.entries(vs.rs.values)) {
    if (value) {
      styleProps.push(`${prop}: ${value}`);
    }
  }
  return styleProps.length > 0 ? styleProps.join("; ") : undefined;
}

function buildTplTag(tpl: TplTag): XmlElement {
  const vs = tryGetBaseVariantSetting(tpl);
  assert(vs, "base variant settings must exists");

  const attrs: XmlAttrs = { id: tpl.uuid };

  // Add element name if available
  if (tpl.name) {
    attrs.label = tpl.name;
  }

  // Add inline styles from RuleSet
  const style = getStyleString(vs);
  if (style) {
    attrs.style = style;
  }

  // For text blocks, render inline with text content
  if (isTplTextBlock(tpl)) {
    // Try to get text from vsettings.text (RawText)
    if (isKnownRawText(vs.text)) {
      return { [tpl.tag]: [{ _attr: attrs }, vs.text.text] };
    }
    // Fallback to attrs.children
    if (vs.attrs.children) {
      return { [tpl.tag]: [{ _attr: attrs }, String(vs.attrs.children)] };
    }
  }

  // Build children
  const children = tplChildren(tpl).map((child) => buildTplNode(child));

  return { [tpl.tag]: [{ _attr: attrs }, ...children] };
}

function buildTplComponent(tpl: TplComponent): XmlElement {
  const component = tpl.component;

  const vs = tryGetBaseVariantSetting(tpl);
  assert(vs, "base variant settings must exists");

  const attrs: XmlAttrs = {
    id: tpl.uuid,
    "data-plasmic-name": toVarName(component.name),
  };

  // Collect props into a JSON object
  const propsObj: Record<string, any> = {};

  // Add regular props
  if (vs.args) {
    for (const arg of vs.args) {
      const param = arg.param;
      if (!isSlot(param)) {
        const propName = paramToVarName(component, param);
        const jsonValue = tryExtractJson(arg.expr);
        if (jsonValue !== undefined) {
          propsObj[propName] = jsonValue;
        } else {
          propsObj[propName] = extractExprValue(arg.expr);
        }
      }
    }
  }

  // Add active variants as props
  if (vs.variants) {
    for (const variant of vs.variants) {
      const variantGroup = component.variantGroups.find((group) =>
        group.variants.includes(variant)
      );
      if (variantGroup && variantGroup.param) {
        const propName = paramToVarName(component, variantGroup.param);
        if (isStandaloneVariantGroup(variantGroup)) {
          propsObj[propName] = true;
        } else {
          propsObj[propName] = variant.name;
        }
      }
    }
  }

  if (Object.keys(propsObj).length > 0) {
    attrs["data-props"] = JSON.stringify(propsObj);
  }

  // Add inline styles from RuleSet on the component instance
  const style = getStyleString(vs);
  if (style) {
    attrs.style = style;
  }

  // Build slot contents with <slot> wrappers
  const slotElements: XmlElement[] = [];
  if (vs.args) {
    for (const arg of vs.args) {
      const param = arg.param;
      if (isSlot(param) && isKnownRenderExpr(arg.expr)) {
        const slotName = paramToVarName(component, param);
        const children = arg.expr.tpl.map((child) => buildTplNode(child));
        slotElements.push({
          slot: [{ _attr: { name: slotName } }, ...children],
        });
      }
    }
  }

  return { "plasmic-component": [{ _attr: attrs }, ...slotElements] };
}

function buildTplSlot(tpl: TplSlot): XmlElement {
  const attrs: XmlAttrs = {
    name: tpl.param.variable.name,
    id: tpl.uuid,
  };

  const children = tplChildren(tpl).map((child) => buildTplNode(child));

  return { "slot-target": [{ _attr: attrs }, ...children] };
}

/**
 * Gets proper type for a param based on its actual type
 */
function getParamType(component: Component, param: any): string {
  // Check if this param is a variant group
  const variantGroup = component.variantGroups.find(
    (group) => group.param === param
  );

  if (variantGroup) {
    if (isStandaloneVariantGroup(variantGroup)) {
      return "boolean";
    } else {
      // Multi-variant group - return the variant names as options
      const options = variantGroup.variants.map((v) => v.name).join(" | ");
      return options;
    }
  }

  // Check param type
  if (isBoolType(param.type)) {
    return "boolean";
  }
  if (isNumType(param.type)) {
    return "number";
  }
  if (param.type.name === "href") {
    return "href";
  }
  if (isAnyType(param.type)) {
    return "any";
  }

  // Default to the type name
  return param.type.name || "text";
}

interface TplOverride {
  tplUuid: string;
  vsUid: number;
  rsUid: number;
  styles: Record<string, string>;
}

/**
 * Extracts style overrides for a specific variant.
 * Returns structured data with tpl uuid, variant setting uid, rule set uid, and style values.
 */
function getTplOverrides(
  component: Component,
  variant: Variant
): TplOverride[] {
  if (!component.tplTree) {
    return [];
  }

  const overrides: TplOverride[] = [];

  for (const tpl of flattenTpls(component.tplTree)) {
    const vs = tryGetVariantSetting(tpl, [variant]);
    if (!vs?.rs?.values) {
      continue;
    }

    const styles: Record<string, string> = {};
    for (const [prop, value] of Object.entries(vs.rs.values)) {
      if (value) {
        styles[prop] = value;
      }
    }

    if (Object.keys(styles).length > 0) {
      overrides.push({
        tplUuid: tpl.uuid,
        vsUid: vs.uid,
        rsUid: vs.rs.uid,
        styles,
      });
    }
  }

  return overrides;
}

function buildTplOverride(o: TplOverride): XmlElement {
  return {
    Tpl: [
      { _attr: { id: o.tplUuid } },
      {
        VariantSetting: [
          { _attr: { id: String(o.vsUid) } },
          {
            RuleSet: [
              { _attr: { id: String(o.rsUid) } },
              JSON.stringify(o.styles),
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Builds component props (non-variant params) as <prop> XmlElements.
 */
function buildComponentProps(component: Component): XmlElement[] {
  return component.params
    .filter((param) => isKnownPropParam(param))
    .map((param) => {
      const type = getParamType(component, param);
      const propName = paramToVarName(component, param);

      const attrs: XmlAttrs = {
        name: propName,
        uuid: param.uuid,
      };

      let options: string[] | undefined;
      if (isKnownChoice(param.type)) {
        options = param.type.options as string[];
      }

      if (options) {
        attrs.type = "enum";
        attrs.options = JSON.stringify(options);
      } else {
        attrs.type = type;
      }

      if (param.defaultExpr) {
        const defaultValue = extractExprValue(param.defaultExpr);
        if (defaultValue !== undefined) {
          attrs.default = JSON.stringify(defaultValue);
        }
      }

      return { prop: { _attr: attrs } };
    });
}

/**
 * Builds component variant definitions as <variant> XmlElements.
 * Each variant gets its own entry with the variant's UUID.
 */
function buildComponentVariantDefs(component: Component): XmlElement[] {
  const elements: XmlElement[] = [];
  for (const variantGroup of component.variantGroups) {
    const groupName = paramToVarName(component, variantGroup.param);
    const isStandalone = isStandaloneVariantGroup(variantGroup);

    for (const variant of variantGroup.variants) {
      const attrs: XmlAttrs = {
        name: variant.name,
        uuid: variant.uuid,
        group: groupName,
        type: isStandalone ? "boolean" : "enum",
      };
      elements.push({ variant: { _attr: attrs } });
    }
  }
  return elements;
}

/**
 * Builds variant style overrides as an XmlElement.
 */
function buildComponentVariants(component: Component): XmlElement | null {
  const variantElements: XmlElement[] = [];

  for (const variantGroup of component.variantGroups) {
    for (const variant of variantGroup.variants) {
      const overrides = getTplOverrides(component, variant);
      if (overrides.length > 0) {
        variantElements.push({
          variant: [
            { _attr: { name: toVarName(variant.name), id: variant.uuid } },
            ...overrides.map((o) => buildTplOverride(o)),
          ],
        });
      }
    }
  }

  if (variantElements.length === 0) {
    return null;
  }

  return { VariantSettings: variantElements };
}

/**
 * Generates a prompt representation describing a Plasmic component in XML tags format.
 * Returns a formatted XML string with component metadata, props, slots, tree, and variant settings overrides.
 *
 * <component name="">
 *   <props>
 *     <prop name="color" uuid="..." type="text" />
 *   </props>
 *   <variants>
 *     <variant name="large" uuid="..." group="size" type="enum" />
 *   </variants>
 *   <base-variant-tpl-tree>
 *     ... html-parser-representation ...
 *   </base-variant-tpl-tree>
 *   <VariantSettings>
 *     <variant name="neutral" id="sy5AokJJ7g7H">
 *       <Tpl id="P4urRFgjF3wU">
 *         <VariantSetting id="3008807">
 *           <RuleSet id="3008806">
 *             {"background":"..."}
 *           </RuleSet>
 *         </VariantSetting>
 *       </Tpl>
 *     </variant>
 *   </VariantSettings>
 * </component>
 */
export function serializeComponent(component: Component): string {
  const children: XmlElement[] = [
    { _attr: { name: component.name } },
    { props: buildComponentProps(component) },
    { variants: buildComponentVariantDefs(component) },
  ];

  if (component.tplTree) {
    children.push({
      "base-variant-tpl-tree": [buildTplNode(component.tplTree)],
    });
  } else {
    children.push({ "base-variant-tpl-tree": "" });
  }

  const variantElement = buildComponentVariants(component);
  if (variantElement) {
    children.push(variantElement);
  }

  return toXml({ component: children }) + "\n";
}
