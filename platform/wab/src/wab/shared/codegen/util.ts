import { DeepReadonly } from "@/wab/commons/types";
import { assert, strict } from "@/wab/shared/common";
import {
  isCodeComponent,
  isVariantGroupParam,
} from "@/wab/shared/core/components";
import { Component, Param } from "@/wab/shared/model/classes";
import { isSlot } from "@/wab/shared/SlotUtils";
import { capitalizeFirst, decapitalizeFirst } from "@/wab/shared/strs";
import {
  isValidJsIdentifier,
  validJsIdentifierChars,
} from "@/wab/shared/utils/regex-js-identifier";
import jsStringEscape from "js-string-escape";
import camelCase from "lodash/camelCase";
import deburr from "lodash/deburr";
import head from "lodash/head";
import memoize from "lodash/memoize";
import sortBy from "lodash/sortBy";
import path from "path";

export const jsString = (str: string) => `"${jsStringEscape(str)}"`;

// This prefix is preserved for internal namespaces including
//  - slot style wrapper, which starts with $slot
//  - foreign component instance position wrapper, which starts with $pos
//  - uuid, which starts with $auto.
export const prefixOfInternalNamespace = "$";
export const DEFAULT_CONTEXT_VALUE = "PLEASE_RENDER_INSIDE_PROVIDER";

export const toJsIdentifier = memoize(toJsIdentifier_, (...args) => {
  return `${args[0]}_${args[1]?.capitalizeFirst}_${args[1]?.camelCase}`;
});

/**
 * Converts a string to a valid javascript identifier
 */
function toJsIdentifier_(
  original: string,
  opts?: {
    capitalizeFirst?: boolean;
    allowUnderscore?: boolean;
    camelCase?: boolean;
  }
) {
  let str = original;
  opts = opts || {};

  // Remove anything that's not alphanumeric, space, underscore, dash,
  // arabic, chinese, cyrillic, greek, hindi, japanese and thai letters
  const invalidCharactersRegex = new RegExp(
    [
      "[^",
      ...validJsIdentifierChars({
        allowUnderscore: opts?.allowUnderscore,
        allowSpace: true,
        allowMinusSign: true,
      }),
      "]",
    ].join(""),
    "g"
  );

  str = deburr(str).replace(invalidCharactersRegex, "");
  if (opts.camelCase !== false) {
    str = camelCase(str);
  }

  // Capitalize if requested
  if (opts.capitalizeFirst === true) {
    str = capitalizeFirst(str);
  } else if (opts.capitalizeFirst === false) {
    str = decapitalizeFirst(str);
  }

  // Prepend with "_" if cannot use as a js keyword
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
    return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4);
  });
}

function toArgParamName(str: string) {
  const shouldCamelCase = !(str.startsWith("aria-") || str.startsWith("data-"));
  return toJsIdentifier(str, {
    capitalizeFirst: false,
    camelCase: shouldCamelCase,
  });
}

export function toVarName(str: string) {
  return toJsIdentifier(str, { capitalizeFirst: false });
}

export function paramToVarName(
  component: Component,
  param: DeepReadonly<Param>,
  opts?: {
    useControlledProp?: boolean;
  }
) {
  const ofCodeComponent = isCodeComponent(component);
  if (ofCodeComponent) {
    if (opts?.useControlledProp) {
      return param.variable.name;
    } else {
      return param.propEffect || param.variable.name;
    }
  } else if (isSlot(param) || isVariantGroupParam(component, param)) {
    return toVarName(param.variable.name);
  } else {
    return toArgParamName(param.variable.name);
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
