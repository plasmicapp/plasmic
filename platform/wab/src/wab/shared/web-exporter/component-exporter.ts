import { isSlot } from "@/wab/shared/SlotUtils";
import {
  isPrivateStyleVariant,
  isStandaloneVariantGroup,
  tryGetBaseVariantSetting,
  tryGetVariantSetting,
} from "@/wab/shared/Variants";
import { paramToVarName, toVarName } from "@/wab/shared/codegen/util";
import { assert, switchType } from "@/wab/shared/common";
import {
  isPageComponent,
  tryGetVariantGroupValueFromArg,
} from "@/wab/shared/core/components";
import { tryExtractJson } from "@/wab/shared/core/exprs";
import {
  generateAnimationPropValue,
  isStylePropApplicable,
} from "@/wab/shared/core/styles";
import {
  flattenTpls,
  isTplTextBlock,
  tplChildren,
} from "@/wab/shared/core/tpls";
import { normProp } from "@/wab/shared/css";
import {
  Component,
  Expr,
  RuleSet,
  Site,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Variant,
  VariantSetting,
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
  isOptionsType,
} from "@/wab/shared/model/model-util";
import {
  getDataPlasmicProject,
  serializePlasmicTplComponent,
} from "@/wab/shared/web-exporter/component-utils";
import {
  type ComponentJson,
  type ElementJson,
  type ElementOverrideJson,
  type PageMetaJson,
  type PropJson,
  type VariantDefJson,
  type VariantOverrideJson,
} from "@/wab/shared/web-exporter/schema";
import {
  XmlAttrs,
  XmlElement,
  mkXmlElement,
  toXml,
} from "@/wab/shared/web-exporter/xml-utils";

/**
 * Renders a tpl subtree to HTML markup, used as the `baseVariantTplTree` string
 * of a component or element in the JSON model.
 */
export function tplToHtml(tpl: TplNode, site: Site): string {
  return toXml(buildTplNode(tpl, site));
}

function buildTplNode(tpl: TplNode, site: Site): XmlElement {
  return switchType(tpl)
    .when(TplTag, (tag) => buildTplTag(tag, site))
    .when(TplComponent, (comp) => buildTplComponent(comp, site))
    .when(TplSlot, (slot) => buildTplSlot(slot, site))
    .result();
}

/**
 * Extracts a value from supported expression types via tryExtractJson
 * (CustomCode, TemplatedString, CompositeExpr), plus asset and style-token
 * references. Returns undefined for dynamic expressions (ObjectPath, VarRef,
 * EventHandler, etc.) that can't be serialized statically.
 *
 * By default a non-string JSON value is stringified, for use as an HTML
 * attribute. Pass `{ json: true }` to keep the typed JSON value instead.
 */
function extractStaticExprValue(expr: Expr): string | undefined;
function extractStaticExprValue(expr: Expr, opts: { json: true }): unknown;
function extractStaticExprValue(
  expr: Expr,
  opts?: { json?: boolean }
): unknown {
  const jsonValue = tryExtractJson(expr);
  if (jsonValue !== undefined) {
    if (opts?.json) {
      return jsonValue;
    }
    return typeof jsonValue === "string"
      ? jsonValue
      : JSON.stringify(jsonValue);
  }
  if (isKnownImageAssetRef(expr)) {
    return expr.asset.dataUri || "";
  }
  if (isKnownStyleTokenRef(expr)) {
    return expr.token.uuid;
  }
  return undefined;
}

/**
 * Normalizes a string-or-expression value, falling back for null/undefined and
 * for dynamic expressions that can't be serialized. Defaults to a plain string
 * (""); pass `{ json: true }` to keep the typed JSON value (undefined fallback).
 */
function extractExprValue(value: string | Expr | null | undefined): string;
function extractExprValue(
  value: string | Expr | null | undefined,
  opts: { json: true }
): unknown;
function extractExprValue(
  value: string | Expr | null | undefined,
  opts?: { json?: boolean }
): unknown {
  if (value == null) {
    return opts?.json ? undefined : "";
  }
  if (typeof value === "string") {
    return value;
  }
  return opts?.json
    ? extractStaticExprValue(value, { json: true })
    : extractStaticExprValue(value) ?? "";
}

export function getStylesFromRuleSet(rs: RuleSet): Record<string, string> {
  const styles: Record<string, string> = {};
  if (rs.values) {
    for (const [prop, value] of Object.entries(rs.values)) {
      if (value) {
        styles[prop] = value;
      }
    }
  }
  if (rs.animations && rs.animations.length > 0) {
    const animationValue = generateAnimationPropValue(rs.animations);
    styles["animation"] = animationValue ?? "none";
  }
  return styles;
}

function getStylesFromVariantSetting(
  vs: VariantSetting,
  tpl: TplNode
): Record<string, string> {
  const styles: Record<string, string> = getStylesFromRuleSet(vs.rs);

  // The style attr could be a dynamic expression (e.g. a code expression
  // or data binding) instead of a plain JSON object. In that case
  // tryExtractJson returns undefined, and we skip them.
  const parsed = tryExtractJson(vs.attrs["style"]);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    for (const [prop, value] of Object.entries(parsed)) {
      if (value) {
        styles[normProp(prop)] = String(value);
      }
    }
  }

  // Filter styles to what's applicable for this TplNode
  return Object.fromEntries(
    Object.entries(styles).filter(([prop]) => isStylePropApplicable(tpl, prop))
  );
}

// Attrs that are either rendered by buildTplTag (id, style, children) or store
// internal asset data we don't need in Copilot (e.g. outerHTML on svg resolves
// to a base64 data).
const RESERVED_ATTR_KEYS = new Set(["id", "style", "children", "outerHTML"]);

function getAttrsFromVariantSetting(
  vs: VariantSetting
): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const [key, expr] of Object.entries(vs.attrs)) {
    if (!RESERVED_ATTR_KEYS.has(key)) {
      const value = extractStaticExprValue(expr);
      if (value !== undefined) {
        attrs[key] = value;
      }
    }
  }
  return attrs;
}

function getStyleString(vs: VariantSetting, tpl: TplNode): string | undefined {
  const styles = getStylesFromVariantSetting(vs, tpl);
  const entries = Object.entries(styles);
  if (entries.length === 0) {
    return undefined;
  }
  return entries.map(([prop, value]) => `${prop}: ${value}`).join("; ");
}

function buildTplTag(tpl: TplTag, site: Site): XmlElement {
  const vs = tryGetBaseVariantSetting(tpl);
  assert(vs, "base variant settings must exists");

  const attrs: XmlAttrs = { id: tpl.uuid };

  // Add element name if available
  if (tpl.name) {
    attrs.label = tpl.name;
  }

  // Add inline styles from RuleSet
  const style = getStyleString(vs, tpl);
  if (style) {
    attrs.style = style;
  }

  // Include static HTML attributes
  for (const [key, value] of Object.entries(getAttrsFromVariantSetting(vs))) {
    attrs[key] = value;
  }

  // For text blocks, render inline with text content
  if (isTplTextBlock(tpl)) {
    // Try to get text from vsettings.text (RawText)
    if (isKnownRawText(vs.text)) {
      return mkXmlElement(tpl.tag, attrs, [vs.text.text]);
    }
    // Fallback to attrs.children
    if (vs.attrs.children) {
      return mkXmlElement(tpl.tag, attrs, [String(vs.attrs.children)]);
    }
  }

  // Build children
  const children = tplChildren(tpl).map((child) => buildTplNode(child, site));

  return mkXmlElement(tpl.tag, attrs, children);
}

function buildTplComponent(tpl: TplComponent, site: Site): XmlElement {
  const component = tpl.component;

  const vs = tryGetBaseVariantSetting(tpl);
  assert(vs, "base variant settings must exists");

  const attrs: XmlAttrs = serializePlasmicTplComponent(site, tpl);

  // Collect regular props and variant-group activations into a JSON object.
  // Variant-group activations are stored on vs.args as Args whose expr is a
  // VariantsRef
  const propsObj: Record<string, any> = {};
  if (vs.args) {
    for (const arg of vs.args) {
      const param = arg.param;
      if (isSlot(param)) {
        continue;
      }
      const propName = paramToVarName(component, param);

      const vgArg = tryGetVariantGroupValueFromArg(component, arg);
      if (vgArg) {
        if (vgArg.variants.length === 0) {
          continue;
        }
        if (isStandaloneVariantGroup(vgArg.vg)) {
          propsObj[propName] = true;
        } else if (vgArg.vg.multi) {
          propsObj[propName] = vgArg.variants.map((v) => v.name);
        } else {
          propsObj[propName] = vgArg.variants[0].name;
        }
        continue;
      }

      propsObj[propName] = extractExprValue(arg.expr, { json: true });
    }
  }

  if (Object.keys(propsObj).length > 0) {
    attrs["data-props"] = JSON.stringify(propsObj);
  }

  // Add inline styles from RuleSet on the component instance
  const style = getStyleString(vs, tpl);
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
        const children = arg.expr.tpl.map((child) => buildTplNode(child, site));
        slotElements.push(mkXmlElement("slot", { name: slotName }, children));
      }
    }
  }

  return mkXmlElement("plasmic-component", attrs, slotElements);
}

function buildTplSlot(tpl: TplSlot, site: Site): XmlElement {
  const attrs: XmlAttrs = {
    name: tpl.param.variable.name,
    id: tpl.uuid,
  };

  const children = tplChildren(tpl).map((child) => buildTplNode(child, site));

  return mkXmlElement("slot-target", attrs, children);
}

/** Gets the proper type string for a param based on its actual type. */
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
  styles: Record<string, string>;
  attrs: Record<string, string>;
}

/** Extracts per-element style/attr overrides for a specific variant. */
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
    if (!vs) {
      continue;
    }

    const styles = getStylesFromVariantSetting(vs, tpl);
    const attrs = getAttrsFromVariantSetting(vs);

    if (Object.keys(styles).length > 0 || Object.keys(attrs).length > 0) {
      overrides.push({ tplUuid: tpl.uuid, styles, attrs });
    }
  }

  return overrides;
}

function buildComponentProps(component: Component): PropJson[] {
  return component.params
    .filter((param) => isKnownPropParam(param))
    .map((param) => {
      const options = isOptionsType(param.type)
        ? (param.type.options as string[])
        : undefined;
      const prop: PropJson = {
        __type: "Prop",
        name: paramToVarName(component, param),
        uuid: param.uuid,
        type: options ? "enum" : getParamType(component, param),
      };
      if (options) {
        prop.options = options;
      }
      if (param.defaultExpr) {
        const defaultValue = extractExprValue(param.defaultExpr, {
          json: true,
        });
        if (defaultValue !== undefined) {
          prop.default = defaultValue;
        }
      }
      return prop;
    });
}

interface SerializableVariant {
  /** The model variant, used to read its per-element overrides. */
  variant: Variant;
  /** The variant's canonical JSON definition. */
  variantDef: VariantDefJson;
}

/**
 * Collects all variants to serialize (component variant groups + element style
 * variants), each paired with its canonical JSON definition.
 */
function getComponentVariants(component: Component): SerializableVariant[] {
  const result: SerializableVariant[] = [];

  for (const variantGroup of component.variantGroups) {
    const group = paramToVarName(component, variantGroup.param);
    const type = isStandaloneVariantGroup(variantGroup)
      ? "boolean"
      : variantGroup.multi
      ? "multi"
      : "single";
    for (const variant of variantGroup.variants) {
      result.push({
        variant,
        variantDef: {
          __type: "ComponentVariant",
          variant: {
            __type: "Variant",
            name: toVarName(variant.name),
            uuid: variant.uuid,
          },
          type,
          group,
        },
      });
    }
  }

  for (const variant of component.variants.filter(isPrivateStyleVariant)) {
    result.push({
      variant,
      variantDef: {
        __type: "ElementVariant",
        variant: {
          __type: "Variant",
          name: variant.selectors.join(", "),
          uuid: variant.uuid,
        },
        elementUuid: variant.forTpl.uuid,
      },
    });
  }

  return result;
}

function buildComponentVariantDefs(component: Component): VariantDefJson[] {
  return getComponentVariants(component).map((entry) => entry.variantDef);
}

function buildVariantOverrides(
  component: Component
): VariantOverrideJson[] | undefined {
  const variantOverrides: VariantOverrideJson[] = [];
  for (const { variant, variantDef } of getComponentVariants(component)) {
    const overrides = getTplOverrides(component, variant);
    if (overrides.length === 0) {
      continue;
    }
    variantOverrides.push({
      __type: "VariantOverride",
      variant: variantDef.variant,
      elements: overrides.map((o) => {
        const element: ElementOverrideJson = {
          __type: "ElementOverride",
          uuid: o.tplUuid,
        };
        if (Object.keys(o.styles).length > 0) {
          element.styles = o.styles;
        }
        if (Object.keys(o.attrs).length > 0) {
          element.attrs = o.attrs;
        }
        return element;
      }),
    });
  }
  return variantOverrides.length > 0 ? variantOverrides : undefined;
}

function buildPageMeta(component: Component): PageMetaJson | undefined {
  if (!isPageComponent(component)) {
    return undefined;
  }
  const pm = component.pageMeta;
  const params =
    pm.params && Object.keys(pm.params).length > 0 ? pm.params : undefined;
  const query =
    pm.query && Object.keys(pm.query).length > 0 ? pm.query : undefined;
  const title = extractExprValue(pm.title);
  const description = extractExprValue(pm.description);
  const canonical = extractExprValue(pm.canonical);
  const openGraphImage = extractExprValue(pm.openGraphImage);
  return {
    __type: "PageMeta",
    ...(pm.path ? { path: pm.path } : {}),
    ...(params ? { params } : {}),
    ...(query ? { query } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(canonical ? { canonical } : {}),
    ...(openGraphImage ? { openGraphImage } : {}),
  };
}

/**
 * Build the canonical JSON model for a component: metadata, props, variant
 * definitions, the base-variant tpl tree (as HTML markup), and per-variant
 * style/attr overrides.
 */
export function buildComponentResource(
  component: Component,
  opts: { site: Site }
): ComponentJson {
  const pageMeta = buildPageMeta(component);
  const fromProject = getDataPlasmicProject(opts.site, component);
  const variantSettings = buildVariantOverrides(component);
  return {
    __type: "Component",
    name: component.name,
    uuid: component.uuid,
    type: component.type as ComponentJson["type"],
    ...(pageMeta ? { pageMeta } : {}),
    ...(fromProject ? { fromProject } : {}),
    props: buildComponentProps(component),
    variants: buildComponentVariantDefs(component),
    baseVariantTplTree: component.tplTree
      ? tplToHtml(component.tplTree, opts.site)
      : "",
    ...(variantSettings ? { variantSettings } : {}),
  };
}

/** Build the canonical JSON model for a standalone element (tpl subtree). */
export function buildElementResource(
  tpl: TplNode,
  opts: { site: Site }
): ElementJson {
  return {
    __type: "Element",
    baseVariantTplTree: tplToHtml(tpl, opts.site),
  };
}
