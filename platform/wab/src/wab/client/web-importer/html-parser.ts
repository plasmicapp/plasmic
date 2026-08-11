import { parseComponent } from "@/wab/client/web-importer/component";
import {
  BASE_VARIANT,
  ignoredStyles,
  ignoredTags,
  layoutStyleKeys,
  paragraphTags,
  recognizedStylesKeys,
  SELF_SELECTOR,
  translationTable,
} from "@/wab/client/web-importer/constants";
import { WIError, WIImportFailedError } from "@/wab/client/web-importer/errors";
import {
  compareSpecificity,
  getSpecificity,
} from "@/wab/client/web-importer/specificity";
import {
  WIAnimationSequence,
  WIContainer,
  WIElement,
  WIFragment,
  WIKeyFrame,
  WIRule,
  WISafeStyles,
  WITree,
  WIUnsafeStyles,
  WIUnsanitizedStyles,
  WIVariant,
  WIVariantSettings,
} from "@/wab/client/web-importer/types";
import { findTokenByNameOrUuid } from "@/wab/commons/StyleToken";
import { ensure, ensureType, isOneOf, withoutNils } from "@/wab/shared/common";
import {
  expandGapProperty,
  parseCss,
  parseCssNumericNew,
  parseShorthandProperties,
  shorthandProperties,
  ShorthandProperty,
} from "@/wab/shared/css";
import { parseScreenSpec } from "@/wab/shared/css-size";
import { parseAspectRatioFromValueNode } from "@/wab/shared/css/aspect-ratio";
import { isBorderProp, parseBorderShorthand } from "@/wab/shared/css/border";
import { findAllAndMap } from "@/wab/shared/css/css-tree-utils";
import { parseFlexShorthand } from "@/wab/shared/css/flex";
import { splitCssValue } from "@/wab/shared/css/parse";
import { CssTransforms } from "@/wab/shared/css/transforms";
import { hasInvalidUrl } from "@/wab/shared/css/urls";
import { GENERAL_TAGS } from "@/wab/shared/html";
import { Site } from "@/wab/shared/model/classes";
import { VariantGroupType } from "@/wab/shared/Variants";
import {
  Atrule,
  CssNode,
  parse as cssParse,
  Declaration,
  generate,
  List,
  Rule,
  Selector,
  walk,
} from "css-tree";
import { camelCase, isElement } from "lodash";
import { err, ok, Result } from "neverthrow";

/**
 * Splits a CSS selector into base selector and pseudo-selector parts using AST.
 * Returns null if the selector contains pseudo-elements (::before, ::after, etc.)
 * which cannot be targeted in the DOM.
 *
 * @param selectorNode - The css-tree Selector node to process
 * @returns Object with baseSelector and pseudoSelector, or null if contains PseudoElementSelector
 *
 * Examples:
 * - ".container .a" → { baseSelector: ".container .a", pseudoSelector: null }
 * - ".container .a:hover" → { baseSelector: ".container .a", pseudoSelector: "hover" }
 * - ".container .a:hover h2" → { baseSelector: ".container .a", pseudoSelector: "hover h2" }
 * - ".container::before" → null
 * - ".container:hover::before" → null
 */
function splitSelectorByPseudo(selectorNode: Selector): {
  baseSelector: string;
  pseudoSelector: string | null;
} | null {
  const children = selectorNode.children.toArray();

  // If any PseudoElementSelector exists, return null (we don't process pseudo-elements)
  if (children.some((child) => child.type === "PseudoElementSelector")) {
    return null;
  }

  // Find the first PseudoClassSelector
  const pseudoClassIndex = children.findIndex(
    (child) => child.type === "PseudoClassSelector"
  );

  // No pseudo-class found - return full selector as base
  if (pseudoClassIndex === -1) {
    return {
      baseSelector: generate(selectorNode),
      pseudoSelector: null,
    };
  }

  // Split children at the pseudo-class
  const baseChildren = children.slice(0, pseudoClassIndex);
  const pseudoChildren = children.slice(pseudoClassIndex);

  // Generate base selector string
  const baseSelector = generate({
    type: "Selector",
    children: new List<CssNode>().fromArray(baseChildren),
  });

  // Generate pseudo selector string and strip the leading colon
  // e.g., ":hover h2" → "hover h2"
  const pseudoSelector = generate({
    type: "Selector",
    children: new List<CssNode>().fromArray(pseudoChildren),
  }).replace(/^:/, "");

  return {
    baseSelector,
    pseudoSelector,
  };
}

// Delimiter for joining/splitting context strings with pseudo-selectors
// e.g., "base--hover", "GlobalScreen__768--hover"
const CONTEXT_PSEUDO_DELIMITER = "--";

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
    for (let i = 0; i < node.childNodes.length; i++) {
      traverseNodes(node.childNodes[i], callback);
    }
  }
}

function describeNodeSegment(elt: Element): string {
  const tag = elt.tagName.toLowerCase();
  const name = elt.getAttribute("data-plasmic-name");
  const base =
    tag === "plasmic-component"
      ? `plasmic-component[${
          elt.getAttribute("data-plasmic-component") || "?"
        }]`
      : name
      ? `${tag}[data-plasmic-name="${name}"]`
      : tag;

  const parent = elt.parentElement;
  if (parent) {
    const sameTagSiblings = Array.from(parent.children).filter(
      (child) => child.tagName === elt.tagName
    );
    if (sameTagSiblings.length > 1) {
      return `${base}:nth-of-type(${sameTagSiblings.indexOf(elt) + 1})`;
    }
  }
  return base;
}

/**
 * Builds a human/LLM-readable locator for an element in the parsed document,
 * e.g. `body > section:nth-of-type(2) > plasmic-component[Button]`.
 */
function describeNodePath(elt: Element): string {
  const segments: string[] = [];
  let cur: Element | null = elt;
  while (cur && cur.tagName.toLowerCase() !== "html") {
    segments.unshift(describeNodeSegment(cur));
    if (cur.tagName.toLowerCase() === "body") {
      break;
    }
    cur = cur.parentElement;
  }
  return segments.join(" > ");
}

/** Stamp missing paths onto style errors that were produced without node context. */
function withStyleErrorPath(errors: WIError[], path: string): WIError[] {
  return errors.map((e) =>
    e.code === "invalid-style-declaration" && !e.path ? { ...e, path } : e
  );
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

function addSelfStyleRule(_node: Node, errors: WIError[]) {
  if (!isElement(_node)) {
    return;
  }
  const cssText = (_node as HTMLElement).style.cssText;
  if (!cssText) {
    return;
  }

  const styles = cssText.split(";").reduce((acc, style) => {
    if (!style.trim()) {
      return acc;
    }
    const [key, value] = style.split(":");
    if (!key || !value) {
      errors.push({
        code: "invalid-style-declaration",
        prop: (key ?? style).trim(),
        value: (value ?? "").trim(),
        path: describeNodePath(_node as Element),
        reason: "malformed inline style declaration",
      });
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

/**
 * The underlying value parsers (peg-based parseCss, CssTransforms, css-tree etc)
 * could throw on values they can't handle; and a throw here is an expected domain failure,
 * so it's converted into an `invalid-style-declaration` Err for the caller to
 * drop-and-report rather than crashing the whole import.
 */
function fixCSSValue(
  key: string,
  value: string
): Result<Record<string, string>, WIError> {
  return Result.fromThrowable(
    () => fixCSSValueUnsafe(key, value),
    (e): WIError => ({
      code: "invalid-style-declaration",
      prop: key,
      value,
      reason: e instanceof Error ? e.message : String(e),
    })
  )();
}

function fixCSSValueUnsafe(key: string, value: string): Record<string, string> {
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

  if (fixedKey === "flex") {
    return parseFlexShorthand(valueNode);
  }

  if (fixedKey === "aspectRatio") {
    return parseAspectRatioFromValueNode(valueNode);
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

  if (fixedKey === "transform") {
    return {
      transform: CssTransforms.fromCss(fixedValue).showCss(),
    };
  }

  return {
    [fixedKey]: fixedValue,
  };
}

function splitStylesBySafety(styles: Record<string, string>): {
  safe: WISafeStyles;
  unsafe: WIUnsafeStyles;
} {
  const safe: WISafeStyles = {};
  const unsafe: WIUnsafeStyles = {};
  for (const [key, value] of Object.entries(styles)) {
    if (recognizedStylesKeys.has(key) && !hasInvalidUrl(value)) {
      safe[key] = value;
    } else {
      unsafe[key] = value;
    }
  }
  return {
    safe,
    unsafe,
  };
}

function renameTokenVarNameToUuid(
  value: string,
  site: Site,
  errors: WIError[]
) {
  const unresolvedTokens = new Set<string>();
  const renamed = value.replaceAll(
    /var\(--token-([^)]+)\)/g,
    (match, tokenIdentifier) => {
      const token = findTokenByNameOrUuid(tokenIdentifier, { site });
      if (token) {
        return `var(--token-${token.uuid})`;
      }
      unresolvedTokens.add(tokenIdentifier);
      return match;
    }
  );
  for (const token of unresolvedTokens) {
    errors.push({ code: "unresolved-token", token });
  }
  return renamed;
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
    // Split to separate screen part from pseudo-selector
    const [screenPart, pseudoSelector] = context.split(
      CONTEXT_PSEUDO_DELIMITER
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
  } else if (context.includes(CONTEXT_PSEUDO_DELIMITER)) {
    // In case of (base--hover) we only care about the pseudo selector since we
    // do not create combination with base variant, it's styles are considered implicitly in all variants.
    const pseudoSelector = context.split(CONTEXT_PSEUDO_DELIMITER)[1];
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
  node: Element,
  defaultStyles: CSSStyleDeclaration,
  errors: WIError[]
): WIVariantSettings[] {
  const path = describeNodePath(node);
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

  // Only create base variant settings if there are meaningful styles
  if (Object.keys(processedBaseStyles).length > 0) {
    const sanitizedStyles = processUnsanitizedStyles(processedBaseStyles);
    errors.push(...withStyleErrorPath(sanitizedStyles.errors, path));

    const baseVariantSettings: WIVariantSettings = {
      unsanitizedStyles: processedBaseStyles,
      safeStyles: sanitizedStyles.safe,
      unsafeStyles: sanitizedStyles.unsafe,
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
      const sanitizedStyles = processUnsanitizedStyles(contextStyles);
      errors.push(...withStyleErrorPath(sanitizedStyles.errors, path));
      const contextVariantSettings: WIVariantSettings = {
        unsanitizedStyles: contextStyles,
        safeStyles: sanitizedStyles.safe,
        unsafeStyles: sanitizedStyles.unsafe,
        variantCombo,
      };

      variantSettings.push(contextVariantSettings);
    }
  }

  return variantSettings;
}

export function processUnsanitizedStyles(
  unsanitizedStyles: WIUnsanitizedStyles
): {
  safe: WISafeStyles;
  unsafe: WIUnsafeStyles;
  errors: WIError[];
} {
  const newStyles: Record<string, string> = {};
  const errors: WIError[] = [];
  for (const [key, value] of Object.entries(unsanitizedStyles)) {
    fixCSSValue(key, value).match(
      (fixedStyles) => Object.assign(newStyles, fixedStyles),
      (error) => errors.push(error)
    );
  }

  // Handle gap property expansion based on display type
  if (newStyles["gap"]) {
    const gapValue = newStyles["gap"];

    const isGridLayout =
      newStyles["display"] === "grid" || newStyles["display"] === "inline-grid";

    const expandedGapProperties = expandGapProperty(gapValue, isGridLayout);

    delete newStyles["gap"];
    Object.assign(newStyles, expandedGapProperties);
  }

  return { ...splitStylesBySafety(newStyles), errors };
}

function hasLayoutStyleKeys(variantSettings: WIVariantSettings[]): boolean {
  for (const variantSetting of variantSettings) {
    for (const key of Object.keys(variantSetting.unsanitizedStyles)) {
      if (layoutStyleKeys.includes(camelCase(key))) {
        return true;
      }
    }
  }
  return false;
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
  errors: WIError[]
) {
  function rec(elt: Node): WIElement | null {
    if (elt.nodeType === Node.TEXT_NODE) {
      const text = (elt.textContent ?? "").trim();
      if (!text) {
        return null;
      }

      return {
        type: "text",
        text: text,
        tag: "span",
        // Text nodes can't be targeted by selectors; they inherit their
        // parent element's path.
        path: elt.parentElement ? describeNodePath(elt.parentElement) : "",
        // When Node type is TEXT_NODE, it's the leaf node so it will always get
        // it's text styles from the parent element such as div, button etc
        // <div>Hello</div>, <button>Click</button>
        // In above examples, "Hello" or "Click" cannot be styled, the styles will only
        // exists on div or button elements, hence variantSettings and attrs will always be empty.
        variantSettings: [],
        attrs: {},
      };
    }

    if (!(elt instanceof HTMLElement || elt instanceof SVGSVGElement)) {
      return null;
    }

    const tag = elt.tagName.toLowerCase();
    if (ignoredTags.has(tag)) {
      return null;
    }

    const path = describeNodePath(elt);

    const allVariantSettings = getVariantSettingsForNode(
      elt,
      defaultStyles,
      errors
    );

    const attrs = [...elt.attributes].reduce((acc, attr) => {
      acc[attr.name] = attr.value;
      return acc;
    }, {} as Record<string, string>);

    if (elt instanceof HTMLElement && tag === "plasmic-component") {
      return parseComponent(
        elt,
        allVariantSettings,
        attrs,
        rec,
        path,
        errors
      ).match(
        (component) => component,
        (error) => {
          errors.push(error);
          return null;
        }
      );
    }

    if (tag === "slot-target") {
      const name = attrs["name"];
      if (!name) {
        errors.push({
          code: "invalid-slot-target",
          path,
          reason: `missing a "name" attribute`,
        });
        return null;
      }
      if (elt.querySelector("slot-target")) {
        errors.push({
          code: "invalid-slot-target",
          path,
          reason: "it contains a nested <slot-target>; slots cannot be nested",
        });
        return null;
      }
      return {
        type: "slot-target",
        path,
        tag,
        name,
        defaultChildren: withoutNils([...elt.childNodes].map((e) => rec(e))),
        attrs,
        variantSettings: allVariantSettings,
      };
    }

    if (tag === "slot") {
      errors.push({
        code: "invalid-slot",
        path,
        reason: `a <slot> is only allowed as a direct child of <plasmic-component> to fill one of its slots; to define a new slot, use <slot-target name="...">`,
      });
      return null;
    }

    if (tag === "svg") {
      const [_minX, _minY, viewBoxWidth, viewBoxHeight] = (
        elt.getAttribute("viewBox") || "0 0 16 16"
      ).split(/\s+/);

      const fallbackDimension = ensure(parseCssNumericNew("16"));
      // Unparseable width/height attrs fallbacks to the viewBox size and then
      // to 16px (instead of crashing the whole import).
      const parsedWidth = parseCssNumericNew(
        elt.getAttribute("width") ?? viewBoxWidth
      );
      const parsedHeight = parseCssNumericNew(
        elt.getAttribute("height") ?? viewBoxHeight
      );
      const w =
        parsedWidth ?? parseCssNumericNew(viewBoxWidth) ?? fallbackDimension;
      const h =
        parsedHeight ?? parseCssNumericNew(viewBoxHeight) ?? fallbackDimension;
      if (!parsedWidth || !parsedHeight) {
        errors.push({
          code: "svg-size-fallback",
          path,
          fallback: `${w.num}${w.units || "px"} × ${h.num}${h.units || "px"}`,
        });
      }
      return {
        type: "svg",
        tag,
        path,
        outerHtml: elt.outerHTML,
        width: `${w.num}${w.units || "px"}`,
        height: `${h.num}${h.units || "px"}`,
        attrs,
        variantSettings: allVariantSettings,
      };
    }

    if (paragraphTags.has(tag) && !hasLayoutStyleKeys(allVariantSettings)) {
      /* elt.innerText is undefined in jsdom environment, so we won't be able to test it.
         https://github.com/testing-library/dom-testing-library/issues/853
       */
      const text = ((elt as HTMLElement).textContent ?? "").trim();
      if (!text) {
        return null;
      }

      return {
        type: "text",
        tag,
        path,
        text,
        attrs,
        variantSettings: allVariantSettings,
      };
    }

    const containerNode: WIContainer = {
      type: "container",
      tag: isOneOf(tag, [...GENERAL_TAGS, "img"]) ? tag : "div",
      path,
      variantSettings: allVariantSettings,
      children: withoutNils([...elt.childNodes].map((e) => rec(e))),
      attrs,
    };

    if (isLikelyEmptyContainer(containerNode)) {
      return null;
    }

    return containerNode;
  }
  return rec(node);
}

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

/**
 * Parse a css-tree `@keyframes` Atrule into a {@link WIAnimationSequence}.
 * Handles `from`/`to`/`N%` selectors and runs each rule's declarations
 * through {@link processUnsanitizedStyles} to split safe vs. unsafe styles.
 * Keyframes are sorted by percentage.
 */
export function processKeyframesRule(
  atrule: Atrule
): Result<{ sequence: WIAnimationSequence; errors: WIError[] }, WIError> {
  if (!atrule.block || !atrule.prelude) {
    return err({ code: "invalid-keyframes", sequence: "<unnamed>" });
  }

  const sequenceName = generate(atrule.prelude).trim();
  const keyframes: WIKeyFrame[] = [];
  const errors: WIError[] = [];

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
          errors.push({
            code: "invalid-keyframes",
            sequence: sequenceName,
            selector: selectorText,
          });
          continue;
        }

        const styles: Record<string, string> = {};
        declarations.forEach((decl) => {
          styles[decl.property] = generate(decl.value);
        });

        const {
          safe,
          unsafe,
          errors: styleErrors,
        } = processUnsanitizedStyles(styles);
        errors.push(...styleErrors);

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

  return ok({
    sequence: {
      name: sequenceName,
      keyframes,
    },
    errors,
  });
}

/**
 * Parses an HTML string into a web-importer tree.
 *
 * Err is returned only when the HTML product nothing importable at all.
 * Partial errors such as invalid-styles only degrade the affected
 * node/declaration and are reported in the result's value.
 */
export async function parseHtmlToWebImporterTree(
  htmlString: string,
  site: Site
): Promise<Result<WITree, WIImportFailedError>> {
  const errors: WIError[] = [];
  const parser = new DOMParser();
  const renamedHtmlString = renameTokenVarNameToUuid(htmlString, site, errors);
  const document = parser.parseFromString(renamedHtmlString, "text/html");

  const root = document.body;
  /* document.body is the root element that translates to a vertical stack and wraps the rest of the design
   * In most of the cases, we need to stretch the design after the html paste so we are considering it to be a better
   * default value for the width. Note that this won't work with Document layout since it has additional special values
   * such as "plasmic-layout-full-bleed" and "plasmic-layout-wide" which sets additional grid-column-start and grid-column-end css.
   */
  root.setAttribute("style", `width: 100%;`);

  traverseNodes(root, (node) => {
    ensureNodeWiRulesContext(node, BASE_VARIANT);
    addSelfStyleRule(node, errors);
  });

  const styleSheet = getStyleSheet(document);
  const parsedStylesheet = cssParse(styleSheet, {
    positions: true,
    onParseError: (error) => {
      errors.push({ code: "invalid-css", message: error.message });
    },
  });

  function storeRuleRelationToNodes(
    context: string,
    selectors: Selector[],
    declarations: Declaration[]
  ) {
    for (const selectorNode of selectors) {
      const selector = generate(selectorNode);

      // Use AST to split selector into base and pseudo parts
      // Returns null if selector contains pseudo-elements (::before, ::after, etc.)
      const parsedSelector = splitSelectorByPseudo(selectorNode);

      // Skip if selector contains pseudo-elements or has no base selector
      if (!parsedSelector || !parsedSelector.baseSelector) {
        errors.push({ code: "unsupported-selector", selector });
        continue;
      }

      const { baseSelector, pseudoSelector } = parsedSelector;

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
          errors.push({ code: "unsupported-selector", selector: baseSelector });
          continue;
        } else {
          throw error;
        }
      }

      if (nodes.length === 0) {
        continue;
      }

      for (const node of nodes) {
        // querySelectorAll searches the whole parsed document; skip elements
        // outside the imported tree (e.g. <head> content) and ignored tags.
        if (
          !root.contains(node) ||
          ignoredTags.has(node.tagName.toLowerCase())
        ) {
          continue;
        }

        const nodeContext = pseudoSelector
          ? `${context}${CONTEXT_PSEUDO_DELIMITER}${pseudoSelector}`
          : context;
        addNodeWIRule(nodeContext, selector, declarations, node);
      }
    }
  }

  const fontDefinitions: string[] = [];
  const animationSequences: WIAnimationSequence[] = [];

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
    // parseScreenSpec throws on conditions it can't read (em/rem widths, orientation queries)
    const specResult = Result.fromThrowable(
      () => parseScreenSpec(mediaCondition),
      (): WIError => ({
        code: "unsupported-media-query",
        query: mediaCondition,
      })
    )();

    if (specResult.isErr()) {
      errors.push(specResult.error);
      return;
    }

    //  Mobile-first uses min-width queries to progressively enhance styles as screen size increases,
    //  while desktop-first uses max-width queries to progressively reduce styles as screen size decreases.
    const screenWidth = specResult.value.maxWidth || specResult.value.minWidth;
    if (!screenWidth) {
      errors.push({ code: "unsupported-media-query", query: mediaCondition });
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
        } else if (node.name === "keyframes") {
          const keyframesResult = processKeyframesRule(node);
          if (keyframesResult.isOk()) {
            animationSequences.push(keyframesResult.value.sequence);
            errors.push(...keyframesResult.value.errors);
          } else {
            errors.push(keyframesResult.error);
          }
        }
        return walk.skip;
      }

      default:
        return;
    }
  });

  // Probe element for the browser's default div styles. Attached outside
  // <body> so it stays out of the imported tree, which is built from body's children.
  const element = document.createElement("div");
  document.documentElement.appendChild(element);
  const defaultStyles = window.getComputedStyle(element);
  const wiTree = getElementsWITree(root, defaultStyles, errors);

  const importFailed = () =>
    err(
      new WIImportFailedError(
        "invalid-html",
        errors,
        "The HTML snippet contains no importable elements"
      )
    );

  if (!wiTree) {
    return importFailed();
  }

  // DOMParser always produces a <body> element, even when the input HTML has
  // no explicit <body> tag. Wrap children in a WIFragment so WebImporter
  // pastes them directly rather than including the synthetic body wrapper.
  const hasExplicitBody = htmlString.toLowerCase().includes("<body");
  if (!hasExplicitBody && wiTree.type === "container") {
    if (wiTree.children.length === 0) {
      return importFailed();
    }
    const wiFragmentRoot: WIFragment = {
      type: "fragment",
      children: wiTree.children,
    };
    return ok({
      wiTree: wiFragmentRoot,
      fontDefinitions,
      animationSequences,
      errors,
    });
  }

  return ok({
    wiTree,
    fontDefinitions,
    animationSequences,
    errors,
  });
}

export const _testOnlyUtils = { fixCSSValue, renameTokenVarNameToUuid };
