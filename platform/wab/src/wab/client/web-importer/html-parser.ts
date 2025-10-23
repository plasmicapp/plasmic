import { ALL_CONTAINER_TAGS } from "@/wab/client/components/sidebar-tabs/HTMLAttributesSection";
import {
  BASE_VARIANT,
  ignoredStyles,
  ignoredTags,
  paragraphTags,
  recognizedStylesKeys,
  SELF_SELECTOR,
  textStylesKeys,
  translationTable,
} from "@/wab/client/web-importer/constants";
import {
  compareSpecificity,
  getSpecificity,
} from "@/wab/client/web-importer/specificity";
import {
  getWIVariantComboKey,
  hasStyleVariant,
  WIAnimationSequence,
  WIContainer,
  WIElement,
  WIKeyFrame,
  WIRule,
  WISafeStyles,
  WIUnsafeStyles,
  WIUnsanitizedStyles,
  WIVariant,
  WIVariantSettings,
} from "@/wab/client/web-importer/types";
import { findTokenByNameOrUuid } from "@/wab/commons/StyleToken";
import {
  assert,
  ensure,
  ensureType,
  withoutNils,
  xDifference,
} from "@/wab/shared/common";
import { ColorFill } from "@/wab/shared/core/bg-styles";
import {
  expandGapProperty,
  parseCss,
  parseCssNumericNew,
  parseShorthandProperties,
  shorthandProperties,
  ShorthandProperty,
} from "@/wab/shared/css";
import { parseScreenSpec } from "@/wab/shared/css-size";
import { isBorderProp, parseBorderShorthand } from "@/wab/shared/css/border";
import { findAllAndMap } from "@/wab/shared/css/css-tree-utils";
import { splitCssValue } from "@/wab/shared/css/parse";
import { Site } from "@/wab/shared/model/classes";
import { VariantGroupType } from "@/wab/shared/Variants";
import {
  Atrule,
  CssNode,
  parse as cssParse,
  Declaration,
  generate,
  Rule,
  Selector,
  walk,
} from "css-tree";
import { camelCase, isElement } from "lodash";

const PSEUDO_SELECTOR_SPLIT_REGEX = /:([\s\S]*)/;

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function getStyleSheet(document: Document) {
  const styleElements = document.querySelectorAll("style");
  let css = "";

  styleElements.forEach((styleElement) => {
    css += styleElement.textContent + "\n";
  });

  return css.trim();
}

function traverseNodes(node: Node, callback: (node: Node) => void) {
  if (isElement(node)) {
    callback(node);
    // We don't want to traverse the children of a component
    if ((node as any).__wi_component) {
      return;
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      traverseNodes(node.childNodes[i], callback);
    }
  }
}

function setInternalId(node: Node) {
  if (!isElement(node)) {
    return;
  }
  const elt = node as HTMLElement;
  const tag = elt.tagName.toLowerCase();
  if (ignoredTags.has(tag)) {
    return;
  }
  (node as any).__wi_ID = generateId();
}

function getInternalId(node: Node) {
  return (node as any).__wi_ID;
}

function ensureNodeWiRules(_node: Node) {
  const node = _node as any;
  if (!node.__wi_rules) {
    node.__wi_rules = {};
  }
}

function ensureNodeWiRulesContext(_node: Node, context: string) {
  const node = _node as any;
  ensureNodeWiRules(node);
  if (!node.__wi_rules[context]) {
    node.__wi_rules[context] = [];
  }
}

function addNodeWIRule(
  context: string,
  selector: string,
  declarations: Declaration[],
  _node: Node
) {
  const node = _node as any;
  ensureNodeWiRulesContext(_node, context);

  const wiRules = withoutNils(
    declarations.map((decl) => {
      return {
        styles: {
          [decl.property]: generate(decl.value),
        },
        selector,
        specificity: getSpecificity(selector, decl.loc),
      };
    })
  );

  node.__wi_rules[context].push(...wiRules);
}

function addSelfStyleRule(_node: Node) {
  if (!isElement(_node)) {
    return;
  }
  const cssText = (_node as HTMLElement).style.cssText;
  if (!cssText) {
    return;
  }

  const styles = cssText.split(";").reduce((acc, style) => {
    const [key, value] = style.split(":");
    if (!key || !value) {
      console.log("Invalid style", style);
      return acc;
    }
    acc[key.trim()] = value.trim();
    return acc;
  }, {} as Record<string, string>);

  ensureNodeWiRulesContext(_node, BASE_VARIANT);
  (_node as any).__wi_rules.base.push({
    styles,
    selector: SELF_SELECTOR,
    specificity: getSpecificity(SELF_SELECTOR),
  });
}

function computeStylesFromWIRules(rules: WIRule[]) {
  // the higher the specificity, the higher the priority
  const sortedRules = rules.sort((a, b) => {
    return -compareSpecificity(a.specificity, b.specificity);
  });
  const styles = sortedRules.reduce((acc, rule) => {
    // Already existing styles have higher priority
    return { ...rule.styles, ...acc };
  }, {} as Record<string, string>);
  return styles;
}

function fixCSSValue(key: string, value: string) {
  if (!value) {
    return {};
  }

  function getFixedKey() {
    const val = camelCase(key);
    if (val in translationTable) {
      return translationTable[val as keyof typeof translationTable];
    }
    return val;
  }

  const fixedKey = getFixedKey();

  if (ignoredStyles.has(fixedKey)) {
    return {};
  }

  function getFixedValue() {
    if (value.startsWith("env(")) {
      const envTerms = value.slice(4, -1).split(/\s*,\s*/);
      return envTerms[1]?.trim();
    }

    if (value === "inline-flex") {
      return "flex";
    }

    if (value.endsWith("!important")) {
      return value.slice(0, -10);
    }

    if (value === "transparent") {
      return "rgba(0, 0, 0, 0)";
    }

    return value;
  }

  const fixedValue = getFixedValue();

  const valueNode = cssParse(fixedValue, { context: "value" });
  if (valueNode.type !== "Value") {
    return {};
  }

  if (shorthandProperties.includes(fixedKey as ShorthandProperty)) {
    return parseShorthandProperties(fixedKey as ShorthandProperty, valueNode);
  }

  if (isBorderProp(fixedKey)) {
    return parseBorderShorthand(fixedKey, valueNode);
  }

  if (fixedKey === "backgroundColor") {
    return {
      background: parseCss(fixedValue, {
        startRule: "backgroundColor",
      }).showCss(),
    };
  }

  if (fixedKey === "background") {
    return {
      background: parseCss(fixedValue, {
        startRule: "background",
      }).showCss(),
    };
  }

  if (fixedKey === "boxShadow") {
    return {
      boxShadow: parseCss(fixedValue, { startRule: "boxShadows" }).showCss(),
    };
  }

  if (fixedKey === "fontFamily") {
    // Parse font-family values and extract only the first font name
    // CSS allows multiple fonts like '"Playfair Display", sans-serif'
    // but Font Family dropdown in Typography Section expects a single font
    const fontValues = splitCssValue("fontFamily", fixedValue);
    const firstFont = fontValues[0].replace(/["']/g, "").trim();
    return {
      fontFamily: firstFont,
    };
  }

  return {
    [fixedKey]: fixedValue,
  };
}

function splitStylesBySafety(
  styles: Record<string, string>,
  type?: WIElement["type"]
): { safe: WISafeStyles; unsafe: WIUnsafeStyles } {
  const entries = Object.entries(styles);
  // Currently, we do not support adding textStyle properties on container elements in Studio Design such as 'color' on div
  // which can be used to child elements to inherit styles from using 'currentcolor' value. To support such use cases,
  // we will consider textStyles to be unsafe for container elements so they can be applied by as style attribute in Studio by WebImporter
  const safeStyleKeys =
    type === "container"
      ? xDifference(recognizedStylesKeys, textStylesKeys)
      : recognizedStylesKeys;

  const safe = Object.fromEntries(
    entries.filter(([k, _v]) => safeStyleKeys.has(k))
  );
  const unsafe = Object.fromEntries(
    entries.filter(([k, _v]) => !safeStyleKeys.has(k))
  );
  return {
    safe,
    unsafe,
  };
}

function renameTokenVarNameToUuid(value: string, site: Site) {
  let unmatchedTokenFound = false;
  const fixedValue = value.replaceAll(
    /var\(--token-([^)]+)\)/g,
    (_match, tokenIdentifier) => {
      const token = findTokenByNameOrUuid(tokenIdentifier, { site });
      if (token) {
        return `var(--token-${token.uuid})`;
      }

      unmatchedTokenFound = true;
      return "";
    }
  );

  return unmatchedTokenFound ? null : fixedValue;
}

/**
 * Parses a context string into an array of variants that form a variant combination.
 * This enables support for complex variant targeting like screen breakpoints with pseudo-selectors.
 * Uses double underscore (__) as separator to avoid conflicts with CSS pseudo-selectors (:).
 *
 * @param context - The context string to parse
 * @returns Array of variants that make up the variant combination
 *
 * @example
 * Base variant only
 * parseContextToVariantCombo("base")
 * Returns: [{ type: "base" }]
 *
 * @example
 * Screen variant only
 * parseContextToVariantCombo("global-screen__768")
 * Returns: [{ type: "global-screen", width: 768 }]
 *
 * @example
 * Pseudo-selector only (base is implicit)
 * parseContextToVariantCombo("base:hover")
 * Returns: [{ type: "style", selectors: ["hover"] }]
 *
 * @example
 * Screen variant with pseudo-selector (combination)
 * parseContextToVariantCombo("global-screen__768:hover")
 * Returns: [{ type: "global-screen", width: 768 }, { type: "style", selectors: ["hover"] }]
 */
function parseContextToVariantCombo(context: string): WIVariant[] {
  // Early return for base variant only
  if (context === BASE_VARIANT) {
    return [{ type: "base" }];
  }

  const variantCombo: WIVariant[] = [];

  if (context.startsWith(`${VariantGroupType.GlobalScreen}__`)) {
    // Split by : first to separate screen part from pseudo-selector
    const [screenPart, pseudoSelector] = context.split(
      PSEUDO_SELECTOR_SPLIT_REGEX
    );

    const screenWidth = parseInt(screenPart.split("__")[1], 10);
    variantCombo.push({
      type: VariantGroupType.GlobalScreen,
      width: screenWidth,
    });

    if (pseudoSelector) {
      variantCombo.push({
        type: "style",
        selectors: [pseudoSelector],
      });
    }
  } else if (context.includes(":")) {
    // In case of (base:hover) we only care about the pseudo selector since we
    // do not create combination with base variant, it's styles are considered implicitly in all variants.
    const pseudoSelector = context.split(PSEUDO_SELECTOR_SPLIT_REGEX)[1];
    if (pseudoSelector) {
      variantCombo.push({
        type: "style",
        selectors: [pseudoSelector],
      });
    }
  }

  return variantCombo;
}

function getVariantSettingsForNode(
  node: Node,
  defaultStyles: CSSStyleDeclaration,
  site: Site
): WIVariantSettings[] {
  const wiID = ensure(getInternalId(node), "Expected node to have wiID");

  const rules = ensureType<Record<string, WIRule[]>>((node as any).__wi_rules);
  const baseRules = rules[BASE_VARIANT] ?? [];
  const baseStyles = computeStylesFromWIRules(baseRules);

  const contexts = Object.keys(rules).filter((c) => c !== BASE_VARIANT);
  const variantSettings: WIVariantSettings[] = [];

  // Process base variant styles
  const processedBaseStyles = { ...baseStyles };

  // Add flex-direction default for flex display
  if (processedBaseStyles["display"] === "flex") {
    if (!processedBaseStyles["flex-direction"]) {
      processedBaseStyles["flex-direction"] = "row";
    }
  }

  // Remove styles that match default styles
  const NON_DELETABLE_STYLES = ["flex-direction"];
  for (const [key, value] of Object.entries(processedBaseStyles)) {
    if (
      !NON_DELETABLE_STYLES.includes(key) &&
      defaultStyles.getPropertyValue(key) === value
    ) {
      delete processedBaseStyles[key];
    }
  }

  // Ensure token values exist in the project
  for (const [key, value] of Object.entries(processedBaseStyles)) {
    const fixedValue = renameTokenVarNameToUuid(value, site);
    if (fixedValue === null) {
      delete processedBaseStyles[key];
    } else {
      processedBaseStyles[key] = fixedValue;
    }
  }

  // Only create base variant settings if there are meaningful styles
  if (Object.keys(processedBaseStyles).length > 0) {
    const baseVariantSettings: WIVariantSettings = {
      unsanitizedStyles: processedBaseStyles,
      safeStyles: {},
      unsafeStyles: {},
      variantCombo: [{ type: "base" }],
    };

    variantSettings.push(baseVariantSettings);
  }

  // Process non-base variant styles
  for (const context of contexts) {
    const contextSpecificRules = rules[context];
    const contextBaseRules = [...baseRules].filter((r) => {
      return !contextSpecificRules.some((cr) => cr.selector === r.selector);
    });

    const contextStyles = computeStylesFromWIRules([
      ...contextBaseRules,
      ...contextSpecificRules,
    ]);

    if (Object.keys(contextStyles).length === 0) {
      continue;
    }

    // Ensure token values exist in the project
    for (const [key, value] of Object.entries(contextStyles)) {
      const fixedValue = renameTokenVarNameToUuid(value, site);
      if (fixedValue === null) {
        delete contextStyles[key];
      } else {
        contextStyles[key] = fixedValue;
      }
    }

    // Remove styles that are the same as base variant
    for (const key of Object.keys(contextStyles)) {
      if (processedBaseStyles[key] === contextStyles[key]) {
        delete contextStyles[key];
      }
    }

    // Skip if no meaningful styles remain
    if (Object.keys(contextStyles).length === 0) {
      continue;
    }

    // Create variant settings with appropriate variant combo
    const variantCombo = parseContextToVariantCombo(context);
    if (variantCombo.length > 0) {
      const contextVariantSettings: WIVariantSettings = {
        unsanitizedStyles: contextStyles,
        safeStyles: {},
        unsafeStyles: {},
        variantCombo,
      };

      variantSettings.push(contextVariantSettings);
    }
  }

  return variantSettings;
}

function processUnsanitizedStyles(
  unsanitizedStyles: WIUnsanitizedStyles,
  type?: WIElement["type"]
): { safe: WISafeStyles; unsafe: WIUnsafeStyles } {
  const newStyles = Object.entries(unsanitizedStyles).reduce(
    (acc, [key, value]) => {
      return {
        ...acc,
        ...fixCSSValue(key, value),
      };
    },
    {}
  );

  // Handle gap property expansion based on display type
  if (newStyles["gap"]) {
    const gapValue = newStyles["gap"];

    const isGridLayout =
      newStyles["display"] === "grid" || newStyles["display"] === "inline-grid";

    const expandedGapProperties = expandGapProperty(gapValue, isGridLayout);

    delete newStyles["gap"];
    Object.assign(newStyles, expandedGapProperties);
  }

  return splitStylesBySafety(newStyles, type);
}

function sanitizeVariantSettings(
  variantSettings: WIVariantSettings[],
  type?: WIElement["type"]
): void {
  for (const variantSetting of variantSettings) {
    const { safe, unsafe } = processUnsanitizedStyles(
      variantSetting.unsanitizedStyles,
      type
    );
    variantSetting.safeStyles = safe;
    variantSetting.unsafeStyles = unsafe;
  }
}

function extractTextStylesFromVariantSettings(
  variantSettings: WIVariantSettings[]
) {
  const nonTextVariantSettings: WIVariantSettings[] = [];
  const textVariantSettings: WIVariantSettings[] = [];

  for (const variantSetting of variantSettings) {
    const nonTextStyles = Object.fromEntries(
      Object.entries(variantSetting.unsanitizedStyles).filter(
        ([key, value]) => {
          return !textStylesKeys.has(camelCase(key));
        }
      )
    );

    const textStyles = Object.fromEntries(
      Object.entries(variantSetting.unsanitizedStyles).filter(
        ([key, _value]) => {
          return textStylesKeys.has(camelCase(key));
        }
      )
    );

    if (Object.keys(nonTextStyles).length > 0) {
      const nonTextVariantSetting: WIVariantSettings = {
        ...variantSetting,
        unsanitizedStyles: nonTextStyles,
        safeStyles: {},
        unsafeStyles: {},
      };
      nonTextVariantSettings.push(nonTextVariantSetting);
    }

    if (Object.keys(textStyles).length > 0) {
      const textVariantSetting: WIVariantSettings = {
        ...variantSetting,
        unsanitizedStyles: textStyles,
        safeStyles: {},
        unsafeStyles: {},
      };
      textVariantSettings.push(textVariantSetting);
    }
  }

  return {
    nonTextVariantSettings,
    textVariantSettings,
  };
}

function mergeWIVariantSettings(
  oldVariantSettings: WIVariantSettings[],
  newVariantSettings: WIVariantSettings[]
): WIVariantSettings[] {
  const variantSettingsMap = new Map<string, WIVariantSettings>();

  for (const variantSetting of oldVariantSettings) {
    const key = getWIVariantComboKey(variantSetting.variantCombo);
    variantSettingsMap.set(key, variantSetting);
  }

  // Merge or add new variant settings
  for (const newVs of newVariantSettings) {
    const key = getWIVariantComboKey(newVs.variantCombo);
    const existingVs = variantSettingsMap.get(key);

    if (existingVs) {
      // Merge styles and animations
      const mergedVariantSetting: WIVariantSettings = {
        ...existingVs,
        unsanitizedStyles: {
          ...existingVs.unsanitizedStyles,
          ...newVs.unsanitizedStyles,
        },
        safeStyles: {
          ...existingVs.safeStyles,
          ...newVs.safeStyles,
        },
        unsafeStyles: {
          ...existingVs.unsafeStyles,
          ...newVs.unsafeStyles,
        },
      };
      variantSettingsMap.set(key, mergedVariantSetting);
    } else {
      variantSettingsMap.set(key, newVs);
    }
  }

  return Array.from(variantSettingsMap.values());
}

function isProbablyEmptyVariantSettings(variantSettings: WIVariantSettings[]) {
  if (variantSettings.length === 0) {
    return true;
  }

  if (variantSettings.length > 1) {
    return false;
  }

  // Should be base variant setting here
  const baseVariantSetting = variantSettings.find((vs) =>
    vs.variantCombo.some((v) => v.type === "base")
  );
  if (!baseVariantSetting) {
    return true;
  }

  const baseKeys = Object.keys(baseVariantSetting.unsanitizedStyles);
  if (baseKeys.length === 0) {
    return true;
  }

  const useLessKeys = ["borderColor", "border-color"];
  if (baseKeys.every((key) => useLessKeys.includes(key))) {
    return true;
  }

  return false;
}

function isLikelyEmptyContainer(containerNode: WIContainer) {
  return (
    containerNode.children.length === 0 &&
    isProbablyEmptyVariantSettings(containerNode.variantSettings) &&
    Object.keys(containerNode.attrs).length === 0
  );
}

function getElementsWITree(
  node: Node,
  defaultStyles: CSSStyleDeclaration,
  site: Site
) {
  /**
   * Filters text variant settings to ensure interaction variants like "hover" work correctly on parent containers.
   *
   * Problem: Text styles on container elements go into the 'style' attribute, but if the same text style
   * is also applied on the text node, the text node value takes precedence and the 'style' attribute
   * doesn't apply. This breaks interaction variants like :hover because the text node already has a
   * fixed value that can't be overridden.
   *
   * Example: A button with color: yellow (base) and color: red (hover). Without this filtering:
   * - Container gets: style="color: yellow" and :hover { color: red }
   * - Text node gets: color: yellow (fixed)
   * - Result: Hover doesn't work because text node's color: yellow takes precedence because hover variant has to be on the parent
   * container and not on the text node itself so it doesn't inherit the color red because it has it's own color value.
   *
   * Solution: If there are text styles on style variants (hover, focus, etc.), remove the same
   * CSS properties from the base variant applied to text nodes. This allows parent interaction
   * variants to control text appearance through CSS inheritance.
   *
   * @param ancestorTextInheritanceVariantSettings Text styles inherited from parent containers
   * @returns Filtered variant settings with overriden properties removed
   */
  function updateTextInheritancePropsForInteractionVariants(
    parentTextInheritanceVariantSettings: WIVariantSettings[]
  ): WIVariantSettings[] {
    const styleVariants =
      parentTextInheritanceVariantSettings.filter(hasStyleVariant);

    // Collect all text properties used in interaction (style) variants
    const styleVariantTextProps = new Set<string>();
    styleVariants.forEach((vs) => {
      Object.keys(vs.unsanitizedStyles).forEach((key) => {
        styleVariantTextProps.add(key);
      });
    });

    return withoutNils(
      parentTextInheritanceVariantSettings.map((vs) => {
        if (hasStyleVariant(vs)) {
          return null;
        }

        // If there are interaction variants with text properties, remove those properties from other variants
        if (styleVariantTextProps.size > 0) {
          const nonOverridenTextStyles = Object.fromEntries(
            Object.entries(vs.unsanitizedStyles).filter(([key]) => {
              return !styleVariantTextProps.has(key);
            })
          );

          // Only return variant settings if there are still styles left after filtering out the one exists in style variant
          if (Object.keys(nonOverridenTextStyles).length === 0) {
            return null;
          }

          return {
            ...vs,
            unsanitizedStyles: nonOverridenTextStyles,
          };
        }

        return vs;
      })
    );
  }

  function rec(
    elt: Node,
    parentTextInheritanceVariantSettings: WIVariantSettings[]
  ): WIElement | null {
    if (elt.nodeType === Node.TEXT_NODE) {
      const text = (elt.textContent ?? "").trim();
      if (!text) {
        return null;
      }

      const textVariantSettings =
        updateTextInheritancePropsForInteractionVariants(
          parentTextInheritanceVariantSettings
        );
      sanitizeVariantSettings(textVariantSettings);

      return {
        type: "text",
        text: text,
        tag: "span",
        variantSettings: textVariantSettings,
      };
    }

    const wiID = getInternalId(elt);
    if (!wiID) {
      return null;
    }

    if (!(elt instanceof HTMLElement || elt instanceof SVGSVGElement)) {
      return null;
    }

    const tag = elt.tagName.toLowerCase();
    if (ignoredTags.has(tag)) {
      return null;
    }

    const allVariantSettings = getVariantSettingsForNode(
      elt,
      defaultStyles,
      site
    );
    const { nonTextVariantSettings: variantSettings, textVariantSettings } =
      extractTextStylesFromVariantSettings(allVariantSettings);

    if ((elt as any).__wi_component) {
      const componentVariantSettings = [...variantSettings];
      sanitizeVariantSettings(componentVariantSettings);

      return {
        type: "component",
        tag,
        component: (elt as any).__wi_component,
        variantSettings: componentVariantSettings,
      };
    }

    if (tag === "svg") {
      const [_minX, _minY, viewBoxWidth, viewBoxHeight] = (
        elt.getAttribute("viewBox") || "0 0 16 16"
      ).split(/\s+/);

      const width = parseCssNumericNew(
        elt.getAttribute("width") ?? viewBoxWidth
      );
      const height = parseCssNumericNew(
        elt.getAttribute("height") ?? viewBoxHeight
      );
      assert(width, "'width' expected on SVG element but found undefined");
      assert(height, "'height' expected on SVG element but found undefined");

      const fillColor = ColorFill.fromCss(
        elt.getAttribute("fill") ?? ""
      )?.color;

      const svgVariantSettings = [...variantSettings];
      sanitizeVariantSettings(svgVariantSettings);

      return {
        type: "svg",
        tag,
        outerHtml: elt.outerHTML,
        width: `${width.num}${width.units || "px"}`,
        height: `${height.num}${height.units || "px"}`,
        fillColor: fillColor,
        variantSettings: svgVariantSettings,
      };
    }

    if (paragraphTags.has(tag)) {
      /* elt.innerText is undefined in jsdom environment, so we won't be able to test it.
         https://github.com/testing-library/dom-testing-library/issues/853
       */
      const text = ((elt as HTMLElement).textContent ?? "").trim();
      if (!text) {
        return null;
      }

      const updatedTextVariantSettings =
        updateTextInheritancePropsForInteractionVariants(
          parentTextInheritanceVariantSettings
        );

      const mergedVariantSettings = mergeWIVariantSettings(
        updatedTextVariantSettings,
        allVariantSettings
      );

      sanitizeVariantSettings(mergedVariantSettings);

      return {
        type: "text",
        tag,
        text,
        variantSettings: mergedVariantSettings,
      };
    }

    const attrs = [...elt.attributes].reduce((acc, attr) => {
      acc[attr.name] = attr.value;
      return acc;
    }, {} as Record<string, string>);

    const containerVariantSettings = [...allVariantSettings];
    sanitizeVariantSettings(containerVariantSettings, "container");

    const containerNode: WIContainer = {
      type: "container",
      tag: [...ALL_CONTAINER_TAGS, "img", "svg"].includes(tag) ? tag : "div",
      variantSettings: containerVariantSettings,
      children: withoutNils(
        [...elt.childNodes].map((e) => rec(e, textVariantSettings))
      ),
      attrs: {
        ...attrs,
        __name: "",
      },
    };

    if (isLikelyEmptyContainer(containerNode)) {
      return null;
    }

    return containerNode;
  }
  return rec(node, []);
}

export async function parseHtmlToWebImporterTree(
  htmlString: string,
  site: Site
) {
  const parser = new DOMParser();
  const document = parser.parseFromString(htmlString, "text/html");

  const root = document.body;
  /* document.body is the root element that translates to a vertical stack and wraps the rest of the design
   * In most of the cases, we need to stretch the design after the html paste so we are considering it to be a better
   * default value for the width. Note that this won't work with Document layout since it has additional special values
   * such as "plasmic-layout-full-bleed" and "plasmic-layout-wide" which sets additional grid-column-start and grid-column-end css.
   */
  root.setAttribute("style", `width: 100%;`);

  traverseNodes(root, (node) => {
    setInternalId(node);
    ensureNodeWiRulesContext(node, BASE_VARIANT);
    addSelfStyleRule(node);
  });

  const styleSheet = getStyleSheet(document);
  const parsedStylesheet = cssParse(styleSheet, { positions: true });

  function storeRuleRelationToNodes(
    context: string,
    selectors: Selector[],
    declarations: Declaration[]
  ) {
    for (const selectorNode of selectors) {
      const selector = generate(selectorNode);
      // Split selector at first colon to separate base selector from complex pseudo-selectors
      // Examples: .class:hover -> [".class", "hover"], .product:hover:not(:focus-visible) -> [".product", "hover:not(:focus-visible)"]
      // Complex pseudo-selectors such as :hover:not(:focus-visible) would be applied as custom css private style variants in Studio.
      const [baseSelector, pseudoSelector] = selector.split(
        PSEUDO_SELECTOR_SPLIT_REGEX
      );

      if (!baseSelector) {
        continue;
      }

      let nodes: NodeListOf<Element>;
      try {
        nodes = document.querySelectorAll(baseSelector);
      } catch (error) {
        /* Ignore invalid selectors like keyframe percentages, etc.
         * This can happen with @keyframes selectors like "0%", "from", "to"
         * or other at-rule specific selectors that aren't valid DOM selectors
         */
        if (
          error instanceof DOMException &&
          error.name === "SyntaxError" &&
          error.message.includes("is not a valid selector")
        ) {
          continue;
        } else {
          throw error;
        }
      }

      if (nodes.length === 0) {
        continue;
      }

      for (const node of nodes) {
        const wiID = getInternalId(node);
        if (!wiID) {
          continue;
        }

        const nodeContext = pseudoSelector
          ? `${context}:${pseudoSelector}`
          : context;
        addNodeWIRule(nodeContext, selector, declarations, node);
      }
    }
  }

  const fontDefinitions: string[] = [];
  const animationSequences: WIAnimationSequence[] = [];

  function extractSelectorsFromPrelude(prelude: CssNode) {
    const selectors: Selector[] = [];
    walk(prelude, function (selectorNode) {
      if (selectorNode.type === "Selector") {
        selectors.push(selectorNode);
      }
    });
    return selectors;
  }

  function extractDeclarationsFromBlock(block: CssNode) {
    const declarations: Declaration[] = [];

    walk(block, function (blockNode) {
      if (blockNode.type === "Declaration") {
        declarations.push(blockNode);
      }
    });

    return declarations;
  }

  function processRule(rule: Rule, context: string) {
    const selectors = extractSelectorsFromPrelude(rule.prelude);
    const declarations = extractDeclarationsFromBlock(rule.block);

    storeRuleRelationToNodes(context, selectors, declarations);
  }

  function processMediaRule(atrule: Atrule) {
    // @ rules such as @import, @charset etc does not require block so block can be null here.
    if (!atrule.block) {
      return;
    }

    const mediaCondition = atrule.prelude ? generate(atrule.prelude) : ""; // gives (max-width: 600px) etc
    const spec = parseScreenSpec(mediaCondition);

    //  Mobile-first uses min-width queries to progressively enhance styles as screen size increases,
    //  while desktop-first uses max-width queries to progressively reduce styles as screen size decreases.
    const screenWidth = spec.maxWidth || spec.minWidth;
    if (!screenWidth) {
      return;
    }

    walk(atrule.block, function (mediaNode) {
      if (mediaNode.type === "Rule") {
        processRule(
          mediaNode,
          `${VariantGroupType.GlobalScreen}__${screenWidth}`
        );
      }
    });
  }

  function processFontFaceRule(atrule: Atrule) {
    // @ rules such as @import, @charset etc does not require block so block can be null here.
    if (!atrule.block) {
      return;
    }

    const declarationNodes = findAllAndMap(
      atrule.block.children.toArray(),
      (node) => (node.type === "Declaration" ? node : null)
    );
    const declarations = declarationNodes.map(
      (decl) => `\t${decl.property}: ${generate(decl.value)};`
    );

    fontDefinitions.push(`@font-face {\n${declarations.join("\n")}\n}`);
  }

  function processKeyframesRule(atrule: Atrule): WIAnimationSequence | null {
    if (!atrule.block || !atrule.prelude) {
      return null;
    }

    const sequenceName = generate(atrule.prelude).trim();
    const keyframes: WIKeyFrame[] = [];

    walk(atrule.block, function (keyframeNode) {
      if (keyframeNode.type === "Rule") {
        const selectors = extractSelectorsFromPrelude(keyframeNode.prelude);
        const declarations = extractDeclarationsFromBlock(keyframeNode.block);

        for (const selector of selectors) {
          const selectorText = generate(selector).trim();
          let percentage: number;

          if (selectorText === "from") {
            percentage = 0;
          } else if (selectorText === "to") {
            percentage = 100;
          } else if (selectorText.endsWith("%")) {
            percentage = parseFloat(selectorText.replace("%", ""));
          } else {
            continue; // Skip invalid selectors
          }

          const styles: Record<string, string> = {};
          declarations.forEach((decl) => {
            styles[decl.property] = generate(decl.value);
          });

          const { safe, unsafe } = processUnsanitizedStyles(styles);

          keyframes.push({
            percentage,
            safeStyles: safe,
            unsafeStyles: unsafe,
          });
        }
      }
    });

    // Sort keyframes by percentage
    keyframes.sort((a, b) => a.percentage - b.percentage);

    return {
      name: sequenceName,
      keyframes,
    };
  }

  walk(parsedStylesheet, function (node) {
    switch (node.type) {
      case "Rule": {
        processRule(node, BASE_VARIANT);
        return walk.skip;
      }

      case "Atrule": {
        if (node.name === "media") {
          processMediaRule(node);
          // walk.skip prevents the walk from traversing the same subtree that's
          // already traversed inside processMediaRule
        } else if (node.name === "font-face") {
          processFontFaceRule(node);
        } else if (
          node.name === "keyframes" ||
          node.name === "-webkit-keyframes"
        ) {
          const animationSequence = processKeyframesRule(node);
          if (animationSequence) {
            animationSequences.push(animationSequence);
          }
        }
        return walk.skip;
      }

      default:
        return;
    }
  });

  const element = document.createElement("div");
  document.body.appendChild(element);
  const defaultStyles = window.getComputedStyle(element);
  const wiTree = getElementsWITree(root, defaultStyles, site);

  return { wiTree, fontDefinitions, animationSequences };
}

export const _testOnlyUtils = { fixCSSValue, renameTokenVarNameToUuid };
