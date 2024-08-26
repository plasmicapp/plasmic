import { DeepReadonly } from "@/wab/commons/types";
import { assert, strict } from "@/wab/shared/common";
import {
  isCodeComponent,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import { Component, Param } from "@/wab/shared/model/classes";
import { capitalizeFirst, decapitalizeFirst } from "@/wab/shared/strs";
import {
  isValidJsIdentifier,
  JsIdentifier,
  pNotJsIdentifierChar,
} from "@/wab/shared/utils/regex-js-identifier";
import jsStringEscape from "js-string-escape";
import camelCase from "lodash/camelCase";
import head from "lodash/head";
import memoize from "lodash/memoize";
import sortBy from "lodash/sortBy";
import path from "path";
import { regex } from "regex";

export const jsString = (str: string) => `"${jsStringEscape(str)}"`;

export const DEFAULT_CONTEXT_VALUE = "PLEASE_RENDER_INSIDE_PROVIDER";

/**
 * First check if the string is a valid JavaScript identifier,
 * otherwise use {@link toJsIdentifier}.
 *
 * Use this method instead of {@link toJsIdentifier} when you're pretty sure
 * the string is already valid.
 */
export function ensureJsIdentifier(str: string) {
  if (isValidJsIdentifier(str)) {
    return str;
  } else {
    return toJsIdentifier(str, { camelCase: false });
  }
}

/**
 * Converts user-generated string to a valid JavaScript identifier.
 *
 * By default, the string will be camelCased.
 * Optionally, skip camelCasing or set capitalization.
 */
export const toJsIdentifier = memoize(
  toJsIdentifier_,
  (...args: Parameters<typeof toJsIdentifier_>) => {
    return `${args[0]}_${args[1]?.capitalizeFirst}_${args[1]?.camelCase}`;
  }
);

const reNotJsIdentifierChar = regex("g")`${pNotJsIdentifierChar}`;

function toJsIdentifier_(
  original: string,
  opts?: {
    capitalizeFirst?: boolean;
    camelCase?: boolean;
  }
): JsIdentifier {
  let str = original;

  if (opts?.camelCase !== false) {
    str = camelCase(str);
  }

  str = str.replaceAll(reNotJsIdentifierChar, "");

  // capitalize/de-capitalize if requested
  if (opts?.capitalizeFirst === true) {
    str = capitalizeFirst(str);
  } else if (opts?.capitalizeFirst === false) {
    str = decapitalizeFirst(str);
  }

  // If str is still not valid, it must begin with an illegal character such
  // as a number, or it's a keyword.
  // Either way, prepend with an underscore to fix the issue.
  if (!isValidJsIdentifier(str)) {
    str = `_${str}`;
  }

  assert(
    isValidJsIdentifier(str),
    `Couldn't transform "${original}" into a valid JS identifier.`
  );

  return str;
}

export function sortedDict(
  collection: { [key: string]: string } | [string, string][]
): string {
  const pairs = Array.isArray(collection)
    ? collection
    : Object.entries(collection);
  const body = sortBy(pairs, head)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return strict`{ ${body} }`;
}

export function jsLiteral(val: any) {
  // https://stackoverflow.com/questions/31649362/how-to-make-json-stringify-encode-non-ascii-characters-in-ascii-safe-escaped-for
  return JSON.stringify(val)?.replace(/[\u007F-\uFFFF]/g, function (chr) {
    return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).slice(-4);
  });
}

export function toVarName(str: string) {
  return toJsIdentifier(str, { capitalizeFirst: false });
}

/** Returns the prop name that should be set during codegen. */
export function paramToVarName(
  component: Component,
  param: DeepReadonly<Param>,
  opts?: {
    useControlledProp?: boolean;
  }
) {
  const paramName = param.variable.name;
  if (isCodeComponent(component)) {
    if (opts?.useControlledProp) {
      return paramName;
    } else {
      return param.propEffect || paramName;
    }
  } else if (isPlumeComponent(component) && paramName.startsWith("aria-")) {
    // Plume params are defined in the Plume project (see plume-master-pkg.json).
    // Plume components and their params are copied as users add Plume components
    // to their projects.
    // These are some special params that needs to be handled differently:
    // `aria-label` and `aria-labelledby` props.
    // For normal components, these would be translated to
    // `ariaLabel` and `ariaLabelledby`,
    // but our Plume components in packages/react-web/src/plume
    // and the Plume plugin system in /wab/src/wab/shared/plume
    // expect `aria-label` and `aria-labelledby`.
    // Therefore, we simply return the variable name.
    return paramName;
  } else {
    return toJsIdentifier(paramName, { capitalizeFirst: false });
  }
}

export function toClassName(str: string) {
  return toJsIdentifier(str, { capitalizeFirst: true });
}

// Cannot use path.parse due to bug https://github.com/webpack/webpack/issues/3494
export function stripExtension(filename: string, removeComposedPath = false) {
  const ext = removeComposedPath
    ? filename.substring(filename.indexOf("."))
    : path.extname(filename);
  if (!ext || filename === ext) {
    return filename;
  }
  return filename.substring(0, filename.lastIndexOf(ext));
}

const RE_LINE_SEPARATOR = /\u2028/g;

export function cleanPlainText(text: string, removeInitialLineBreak = false) {
  // The line separator character will generate code as an actual line break in the
  // text string, instead of \n, which is a syntax error; looks like
  // "hello
  //   wrong"
  const plainText = text.replace(RE_LINE_SEPARATOR, "\n");
  if (removeInitialLineBreak) {
    return plainText.replace(/^\n/, "");
  } else {
    return plainText;
  }
}

export function plainTextToReact(text: string, removeInitialLineBreak = false) {
  const cleanText = cleanPlainText(text, removeInitialLineBreak);
  return cleanText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/{/g, "&#123;")
    .replace(/}/g, "&#125;")
    .replace(/^ /gm, "&nbsp;")
    .replace(/ $/gm, "&nbsp;")
    .replace(/ {2}/g, " &nbsp;")
    .replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, "$1<br />$2");
}
