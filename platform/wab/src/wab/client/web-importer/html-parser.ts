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
  SanitizedWIStyles,
  WIContainer,
  WIElement,
  WIRule,
  WIStyles,
} from "@/wab/client/web-importer/types";
import { ensure, ensureType, withoutNils } from "@/wab/shared/common";
import {
  parseCss,
  parseShorthandProperties,
  shorthandProperties,
  ShorthandProperty,
} from "@/wab/shared/css";
import { findAllAndMap } from "@/wab/shared/css/css-tree-utils";
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

function isVariable(value: string) {
  return value.startsWith("var(");
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
    if (value.startsWith("calc(")) {
      const combination = value.slice(5, -1);
      // split all terms of mathematical combination
      const terms = combination.split(/([+\-*/])/);
      // get the likely biggest term
      if (terms.some((term) => term.includes("vh"))) {
        return terms.find((term) => term.includes("vh"))!.trim();
      }
      if (terms.some((term) => term.includes("vw"))) {
        return terms.find((term) => term.includes("vw"))!.trim();
      }
      if (terms.some((term) => term.includes("px"))) {
        return terms.find((term) => term.includes("px"))!.trim();
      }
      return terms[0].trim();
    }

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

  if (fixedKey === "background" || fixedKey === "backgroundColor") {
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

  return {
    [fixedKey]: fixedValue,
  };
}

function splitStylesBySafety(styles: Record<string, string>) {
  const entries = Object.entries(styles);
  const safe = Object.fromEntries(
    entries.filter(([k, v]) => recognizedStylesKeys.has(k))
  );
  const unsafe = Object.fromEntries(
    entries.filter(([k, v]) => !recognizedStylesKeys.has(k))
  );
  return {
    safe,
    unsafe,
  };
}

function getStylesForNode(
  node: Node,
  variables: Map<string, string>,
  defaultStyles: CSSStyleDeclaration
) {
  function resolveVariable(value: string) {
    if (isVariable(value)) {
      const varName = value.slice(4, -1).trim();
      const varValue = variables.get(varName);
      if (!varValue) {
        return undefined;
      }

      if (!isVariable(varValue)) {
        return varValue;
      } else {
        return resolveVariable(varValue);
      }
    }
    return value;
  }

  const wiID = ensure(getInternalId(node), "Expected node to have wiID");

  const rules = ensureType<Record<string, WIRule[]>>((node as any).__wi_rules);

  const baseRules = rules[BASE_VARIANT] ?? [];

  const styles: Record<string, Record<string, string>> = {
    [BASE_VARIANT]: computeStylesFromWIRules(baseRules),
  };

  const contexts = Object.keys(rules).filter((c) => c !== BASE_VARIANT);

  // For media query styles we merge the rules from the base with the media ones
  // to compute the group of rules
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

    styles[context] = contextStyles;
  }

  // Trying to remove some of the rules that are already in the default styles
  // We need to be careful, so with context specific rules so we don't remove them
  {
    const baseStyles = styles[BASE_VARIANT];
    for (const key of Object.keys(baseStyles)) {
      const value = baseStyles[key];
      if (key === "display" && value === "flex") {
        if (!baseStyles["flex-direction"]) {
          baseStyles["flex-direction"] = "row";
        }
      }

      const NON_DELETABLE_STYLES = ["flex-direction"];
      if (
        !NON_DELETABLE_STYLES.includes(key) &&
        defaultStyles.getPropertyValue(key) === value
      ) {
        delete baseStyles[key];
        continue;
      }
    }
  }

  // After processing we look for styles that are the same as the base variant
  // and remove them
  for (const context of Object.keys(styles)) {
    if (context === BASE_VARIANT) {
      continue;
    }

    const baseStyles = styles[BASE_VARIANT];
    const contextStyles = styles[context];
    const contextStylesKeys = Object.keys(contextStyles);
    for (const key of contextStylesKeys) {
      if (baseStyles[key] === contextStyles[key]) {
        delete contextStyles[key];
      }
    }
  }

  return styles;
}

function sanitizeStyles(styles: WIStyles): SanitizedWIStyles {
  return Object.fromEntries(
    Object.entries(styles).map(([context, contextStyles]) => {
      const newStyles = Object.entries(contextStyles).reduce(
        (acc, [key, value]) => {
          return {
            ...acc,
            ...fixCSSValue(key, value),
          };
        },
        {}
      );
      const { safe, unsafe } = splitStylesBySafety(newStyles);
      return [
        context,
        {
          safe,
          unsafe,
        },
      ];
    })
  );
}

function extractTextStyles(styles: WIStyles) {
  const nonTextStyles = Object.fromEntries(
    Object.entries(styles).map(([context, contextStyles]) => {
      return [
        context,
        Object.fromEntries(
          Object.entries(contextStyles).filter(([key, value]) => {
            return !textStylesKeys.includes(camelCase(key));
          })
        ),
      ];
    })
  );

  const textStyles = Object.fromEntries(
    Object.entries(styles).map(([context, contextStyles]) => {
      return [
        context,
        Object.fromEntries(
          Object.entries(contextStyles).filter(([key, value]) => {
            return textStylesKeys.includes(camelCase(key));
          })
        ),
      ];
    })
  );

  return {
    nonTextStyles,
    textStyles,
  };
}

function mergeWIStyles(oldStyles: WIStyles, newStyles: WIStyles) {
  const keys = new Set([...Object.keys(oldStyles), ...Object.keys(newStyles)]);
  return Object.fromEntries(
    [...keys].map((key) => {
      const oldStyle = oldStyles[key];
      const newStyle = newStyles[key];
      if (!oldStyle) {
        return [key, newStyle];
      }
      if (!newStyle) {
        return [key, oldStyle];
      }
      return [key, { ...oldStyle, ...newStyle }];
    })
  );
}

function isProbablyEmptyStyles(styles: WIStyles) {
  const keys = Object.keys(styles);
  if (keys.length === 0) {
    return true;
  }

  if (keys.length > 1) {
    return false;
  }

  // it should be base here
  const baseStyles = styles.base;

  const baseKeys = Object.keys(baseStyles);
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
    isProbablyEmptyStyles(containerNode.unsanitizedStyles) &&
    Object.keys(containerNode.attrs).length === 0
  );
}

function getElementsWITree(
  node: Node,
  variables: Map<string, string>,
  defaultStyles: CSSStyleDeclaration
) {
  // Adapted from platform/wab/src/wab/client/WebImporter.tsx (convertImportableDomToTpl)
  function rec(
    elt: Node,
    ancestorTextInheritanceStyles: WIStyles
  ): WIElement | null {
    if (elt.nodeType === Node.TEXT_NODE) {
      const text = (elt.textContent ?? "").trim();
      if (!text) {
        return null;
      }
      return {
        type: "text",
        text: text,
        tag: "span",
        unsanitizedStyles: ancestorTextInheritanceStyles,
        styles: sanitizeStyles(ancestorTextInheritanceStyles),
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

    const allStyles = getStylesForNode(elt, variables, defaultStyles);
    const { nonTextStyles: styles, textStyles: newTextInheritanceStyles } =
      extractTextStyles(allStyles);

    if ((elt as any).__wi_component) {
      return {
        type: "component",
        tag,
        component: (elt as any).__wi_component,
        unsanitizedStyles: styles,
        styles: sanitizeStyles(styles),
      };
    }

    if (tag === "svg") {
      const [minX, minY, width, height] = (
        elt.getAttribute("viewBox") || "0 0 300 150"
      )
        .split(/\s+/)
        .map(Number);

      return {
        type: "svg",
        tag,
        outerHtml: elt.outerHTML,
        width,
        height,
        unsanitizedStyles: styles,
        styles: sanitizeStyles(styles),
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

      const mergedStyles = mergeWIStyles(
        ancestorTextInheritanceStyles,
        allStyles
      );

      return {
        type: "text",
        tag,
        text,
        unsanitizedStyles: mergedStyles,
        styles: sanitizeStyles(mergedStyles),
      };
    }

    const newAncestorTextInheritanceStyles = mergeWIStyles(
      ancestorTextInheritanceStyles,
      newTextInheritanceStyles
    );

    const attrs = [...elt.attributes].reduce((acc, attr) => {
      acc[attr.name] = attr.value;
      return acc;
    }, {} as Record<string, string>);

    const containerNode: WIContainer = {
      type: "container",
      tag: [...ALL_CONTAINER_TAGS, "img", "svg"].includes(tag) ? tag : "div",
      unsanitizedStyles: styles,
      styles: sanitizeStyles(styles),
      children: withoutNils(
        [...elt.childNodes].map((e) => rec(e, newAncestorTextInheritanceStyles))
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
  return rec(node, {});
}

export async function parseHtmlToWebImporterTree(htmlString: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(htmlString, "text/html");

  const root = document.body;

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

      let nodes: NodeListOf<Element>;
      try {
        nodes = document.querySelectorAll(selector);
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

        addNodeWIRule(context, selector, declarations, node);
      }
    }
  }

  const variables = new Map<string, string>();
  const fontDefinitions: string[] = [];

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

    // TODO: Handle breakpoints
    const mediaCondition = atrule.prelude ? generate(atrule.prelude) : ""; // gives (max-width: 600px) etc
    walk(atrule.block, function (mediaNode) {
      if (mediaNode.type === "Rule") {
        processRule(mediaNode, mediaCondition);
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
    const declarations = declarationNodes.map((decl) =>
      declarations.push(`\t${decl.property}: ${generate(decl.value)};`)
    );

    fontDefinitions.push(`@font-face {\n${declarations.join("\n")}\n}`);
  }

  walk(parsedStylesheet, function (node) {
    switch (node.type) {
      case "Rule":
        processRule(node, BASE_VARIANT);
        break;

      case "Atrule": {
        if (node.name === "media") {
          processMediaRule(node);
        } else if (node.name === "fontFace") {
          processFontFaceRule(node);
        }
        break;
      }

      default:
        break;
    }
  });

  const element = document.createElement("div");
  document.body.appendChild(element);
  const defaultStyles = window.getComputedStyle(element);
  const wiTree = getElementsWITree(root, variables, defaultStyles);

  return { wiTree, fontDefinitions, variables };
}

export const _testOnlyUtils = { fixCSSValue };
