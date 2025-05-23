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
import { parseBoxShadows } from "@/wab/client/web-importer/css-utils";
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
import { assert, ensure, ensureType, withoutNils } from "@/wab/shared/common";
import {
  CssDeclarationAST,
  CssFontFaceAST,
  CssMediaAST,
  CssRuleAST,
  parse,
} from "@adobe/css-tools";
import { camelCase, isElement } from "lodash";

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

async function getStyleSheet(document: Document) {
  const styleSheetsContent = [...document.styleSheets].map((ss) => {
    let content = "";
    try {
      content = [...ss.cssRules]
        .map((cssRule) => {
          return cssRule.cssText;
        })
        .join("\n");
    } catch (e) {}
    return {
      href: ss.href,
      content,
    };
  });

  return styleSheetsContent.map((s) => s.content).join("\n");
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
  rule: CssRuleAST,
  _node: Node
) {
  const node = _node as any;
  ensureNodeWiRulesContext(_node, context);

  const declarations = rule.declarations ?? [];

  const wiRules = withoutNils(
    declarations.map((d) => {
      if (d.type === "comment") {
        return null;
      }
      const decl = ensureType<CssDeclarationAST>(d);
      if (!decl.property) {
        return null;
      }
      return {
        styles: {
          [decl.property!]: decl.value,
        },
        selector,
        specificity: getSpecificity(selector, decl.position),
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

  if (key === "content") {
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

  if (fixedKey === "borderColor") {
    return {
      borderTopColor: fixedValue,
      borderRightColor: fixedValue,
      borderBottomColor: fixedValue,
      borderLeftColor: fixedValue,
    };
  }

  if (fixedKey === "borderStyle") {
    return {
      borderTopStyle: fixedValue,
      borderRightStyle: fixedValue,
      borderBottomStyle: fixedValue,
      borderLeftStyle: fixedValue,
    };
  }

  if (fixedKey === "borderWidth") {
    return {
      borderTopWidth: fixedValue,
      borderRightWidth: fixedValue,
      borderBottomWidth: fixedValue,
      borderLeftWidth: fixedValue,
    };
  }

  if (fixedKey === "borderRadius") {
    return {
      borderTopLeftRadius: fixedValue,
      borderTopRightRadius: fixedValue,
      borderBottomRightRadius: fixedValue,
      borderBottomLeftRadius: fixedValue,
    };
  }

  if (fixedKey === "overflowWrap") {
    if (fixedValue === "break-word") {
      return {};
    }
    return {
      [fixedKey]: fixedValue,
    };
  }

  if (fixedKey === "padding") {
    const tokens = fixedValue.split(/\s+/);
    const all: string[] = [];
    for (let i = 0; i < 4; i++) {
      all.push(tokens[i] ?? tokens[i % 2] ?? tokens[0]);
    }
    return {
      paddingTop: all[0],
      paddingRight: all[1],
      paddingBottom: all[2],
      paddingLeft: all[3],
    };
  }

  if (fixedKey === "boxSizing") {
    return {};
  }

  if (fixedKey === "margin") {
    const tokens = fixedValue.split(/\s+/);
    const all: string[] = [];
    for (let i = 0; i < 4; i++) {
      all.push(tokens[i] ?? tokens[i % 2] ?? tokens[0]);
    }
    return {
      marginTop: all[0],
      marginRight: all[1],
      marginBottom: all[2],
      marginLeft: all[3],
    };
  }

  if (fixedKey === "inset") {
    const tokens = fixedValue.split(/\s+/);
    const all: string[] = [];
    for (let i = 0; i < 4; i++) {
      all.push(tokens[i] ?? tokens[i % 2] ?? tokens[0]);
    }
    return {
      top: all[0],
      right: all[1],
      bottom: all[2],
      left: all[3],
    };
  }

  if (fixedKey === "backgroundColor") {
    if (fixedValue.startsWith("rgb") || fixedValue.startsWith("var")) {
      return {
        background: `linear-gradient(${fixedValue}, ${fixedValue})`,
      };
    }

    return {};
  }

  if (fixedKey === "background") {
    if (fixedValue.startsWith("rgb") || fixedValue.startsWith("var")) {
      function transformStyleString(styleString: string) {
        const separatorIndex = styleString.indexOf(")") + 1;
        const color = styleString.slice(0, separatorIndex);
        const rest = styleString.slice(separatorIndex);
        return `linear-gradient(${color}, ${color})`;
      }

      const transformedValue = transformStyleString(fixedValue);
      return {
        background: transformedValue,
      };
    }
    return {};
  }

  if (fixedKey === "boxShadow") {
    return {
      boxShadow: parseBoxShadows(fixedValue),
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

  const styleSheet = await getStyleSheet(document);

  const root = document.body;

  traverseNodes(root, (node) => {
    setInternalId(node);
    ensureNodeWiRulesContext(node, BASE_VARIANT);
    addSelfStyleRule(node);
  });

  const parsedStyleSheet = parse(styleSheet);

  assert(
    parsedStyleSheet.type === "stylesheet",
    () => `Expected type to be "stylesheet" but got ${parsedStyleSheet.type}`
  );

  const rules = ensure(
    parsedStyleSheet.stylesheet,
    "Expected non-nullish stylesheet"
  ).rules;

  function storeRuleRelationToNodes(
    context: string,
    selector: string,
    rule: CssRuleAST
  ) {
    const nodes = document.querySelectorAll(selector);

    if (nodes.length === 0) {
      return;
    }

    for (const node of nodes) {
      const wiID = getInternalId(node);
      if (!wiID) {
        continue;
      }

      addNodeWIRule(context, selector, rule, node);
    }
  }

  const variables = new Map<string, string>();

  function processRule(context: string, rule: CssRuleAST) {
    const declarations = rule.declarations ?? [];
    for (const decl of declarations) {
      if (decl.type === "comment") {
        continue;
      }
      const declaration = ensureType<CssDeclarationAST>(decl);
      if (declaration.property?.startsWith("--") && declaration.value) {
        variables.set(declaration.property, declaration.value);
      }
    }

    const selectors = rule.selectors;

    if (!selectors) {
      return;
    }

    for (const selector of selectors) {
      storeRuleRelationToNodes(context, selector, rule);
    }
  }

  const fontDefinitions: string[] = [];

  for (const _rule of rules) {
    if (_rule.type === "rule") {
      processRule(BASE_VARIANT, ensureType<CssRuleAST>(_rule));
    } else if (_rule.type === "media") {
      const media = ensureType<CssMediaAST>(_rule);
      const mediaCond = ensure(
        media.media,
        "Expected media to have media condition"
      );
      const mediaRules = media.rules ?? [];
      for (const subRule of mediaRules) {
        if (subRule.type === "rule") {
          processRule(mediaCond, ensureType<CssRuleAST>(subRule));
        }
      }
    } else if (_rule.type === "font-face") {
      const fontFace = ensureType<CssFontFaceAST>(_rule);
      const declarations = fontFace.declarations ?? [];
      const fontDef = declarations
        .map((decl) => {
          if (decl.type === "comment") {
            return "";
          }
          const declaration = ensureType<CssDeclarationAST>(decl);
          if (declaration.property && declaration.value) {
            return `\t${declaration.property}: ${declaration.value};`;
          }
          return "";
        })
        .join("\n");
      fontDefinitions.push(`@font-face {\n${fontDef}\n}`);
    }
  }

  const element = document.createElement("div");
  document.body.appendChild(element);
  const defaultStyles = window.getComputedStyle(element);
  const wiTree = getElementsWITree(root, variables, defaultStyles);

  return { wiTree, fontDefinitions, variables };
}

export const _testOnlyUtils = { fixCSSValue };
