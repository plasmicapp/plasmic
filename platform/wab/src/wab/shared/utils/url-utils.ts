import { assert, ensure } from "@/wab/shared/common";
import { exprToInterpolatedString } from "@/wab/shared/copilot/dynamic-value-input";
import {
  ExprCtx,
  asCode,
  getCodeExpressionWithFallback,
} from "@/wab/shared/core/exprs";
import { TryEvalExprResult, tryEvalExpr } from "@/wab/shared/eval";
import { Expr, PageHref, PageMeta } from "@/wab/shared/model/classes";
import { matchesPagePath } from "@plasmicapp/loader-react";
import { regex } from "regex";

/**
 * Takes in a url template and params, and substitutes in the param values
 * to make a real url
 */
export function substituteUrlParams(
  template: string,
  params: Record<string, string>
) {
  let path = template;
  for (const [key, value] of Object.entries(params)) {
    if (path.includes(`[[${key}]]`)) {
      // Optional catchall params can be empty
      path = substituteCatchallParam(path, `[[${key}]]`, value || "");
    } else if (path.includes(`[${key}]`)) {
      // if value is empty string, keep the placeholder so the path is still valid
      if (value) {
        if (isCatchallParam(key)) {
          path = substituteCatchallParam(path, `[${key}]`, value);
        } else {
          path = path.replace(`[${key}]`, encodeURIComponent(value));
        }
      }
    }
  }
  // Replace optional catchall that still exist with ""
  const remainingParams = extractParamsFromPagePath(path);
  for (const param of remainingParams) {
    if (isCatchallParam(param) && path.includes(`[[${param}]]`)) {
      path = path.replace(`[[${param}]]`, "");
    }
  }
  return path;
}

function substituteCatchallParam(
  template: string,
  marker: string,
  value: string
) {
  // Remove starting and ending `/` from value
  // This behavior matches @plasmicapp/host
  value = value.replace(/^\/|\/$/g, "");
  return template.replace(marker, () => joinDecodedSegments(value.split("/")));
}

export function joinDecodedSegments(
  decodedSegments: string[] | undefined
): string {
  return (decodedSegments ?? []).map(encodeURIComponent).join("/");
}

const reParamKeys = regex("g")`
(?<param>
  \[ \[?         # opening brackets
  (?<key>[^\]]*) # param name, e.g. "slug" or "...catchall"
  \] \]?         # closing brackets
)
`;

/**
 * Extracts param names from page path, but retains the `...`
 * prefix for catchall params
 *
 * /hello/[yes]/and/[[...what]] => ["yes", "...what"]
 */
export function extractParamsFromPagePath(path: string): string[] {
  return [...path.matchAll(reParamKeys)].map((m) => m.groups!["key"]);
}

export interface PathParamMeta {
  type: "Path";
  key: string;
  previewValue: string;
  catchall: boolean;
  required: boolean;
}

export function extractPathParamMetas(pageMeta: PageMeta): PathParamMeta[] {
  // Ordered based on the path
  return [...pageMeta.path.matchAll(reParamKeys)].map((m) => {
    const param = m.groups!["param"];
    const key = m.groups!["key"];
    return {
      type: "Path",
      key,
      previewValue: pageMeta.params[key],
      catchall: key.startsWith("..."),
      required: !(param.startsWith("[[") && param.endsWith("]]")),
    };
  });
}

export interface QueryParamMeta {
  type: "Query";
  key: string;
  previewValue: string;
}

export function extractQueryParamMetas(pageMeta: PageMeta): QueryParamMeta[] {
  return Object.entries(pageMeta.query).map(
    ([key, previewValue]): QueryParamMeta => ({
      type: "Query",
      key,
      previewValue,
    })
  );
}

const reParams = regex("g")`
(?<param>
  \[ \[? # opening brackets
  [^\]]* # param name, e.g. "slug" or "...catchall"
  \] \]? # closing brackets
)
`;

/**
 * Uses `matchesPagePath` from @plasmicapp/loader-react,
 * but handles encoding/decoding.
 */
export function getMatchingPagePathParams(
  pattern: string,
  path: string
): Record<string, string> | false {
  const reEncodedPattern = pattern
    .split("/")
    .map((segment) =>
      segment
        .split(reParams)
        // re-encode non-param parts
        .map((part, i) => (i % 2 === 1 ? part : reEncodeURIComponent(part)))
        .join("")
    )
    .join("/");

  // re-encode all segments
  const reEncodedPath = path
    .split("/")
    .map((segment) => reEncodeURIComponent(segment))
    .join("/");

  const match = matchesPagePath(reEncodedPattern, reEncodedPath);
  if (!match) {
    return false;
  }

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(match.params)) {
    if (Array.isArray(value)) {
      params[`...${key}`] = value.map(tryDecodeURIComponent).join("/");
    } else {
      params[key] = tryDecodeURIComponent(value);
    }
  }

  return params;
}

function reEncodeURIComponent(value: string): string {
  return encodeURIComponent(tryDecodeURIComponent(value));
}

function tryDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

interface GetPageHrefPathProps {
  expr: PageHref;
  exprCtx: ExprCtx;
}

/**
 * Renders a PageHref as a URL: the page path with each param substituted, then
 * `?key=value` query entries, then `#fragment`, with every dynamic value
 * rendered by `renderValue`. Returns undefined for a dangling page ref.
 */
export function renderPageHrefUrl(
  expr: PageHref,
  renderExpr: (
    expr: Expr,
    opts: { encode: boolean; catchall?: boolean }
  ) => string
): string | undefined {
  if (!expr.page?.pageMeta) {
    return undefined;
  }

  let url = expr.page.pageMeta.path;
  for (const [key, value] of Object.entries(expr.params)) {
    const str = renderExpr(value, {
      encode: expr.encode,
      catchall: isCatchallParam(key),
    });
    url = url.replace(`[[${key}]]`, () => str).replace(`[${key}]`, () => str);
  }
  const queryEntries = Object.entries(expr.query || {});
  if (queryEntries.length > 0) {
    const qs = queryEntries
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${renderExpr(value, {
            encode: expr.encode,
          })}`
      )
      .join("&");
    url += `?${qs}`;
  }
  if (expr.fragment != null) {
    url += `#${renderExpr(expr.fragment, {
      encode: false,
    })}`;
  }
  return url;
}

export function encodeUrlSegmentAsCode(
  code: string,
  opts?: { catchall?: boolean }
): string {
  if (opts?.catchall) {
    return (
      `((x) => (Array.isArray(x) ? x : String(x).split("/"))` +
      `.map(encodeURIComponent).join("/"))(${code})`
    );
  } else {
    return `encodeURIComponent(${code})`;
  }
}

/**
 * Converts a PageHref expr to path/URL with.
 * Includes path params, query params, and fragment rendered as code.
 */
export function pageHrefPathToCode({
  expr,
  exprCtx,
}: GetPageHrefPathProps): string {
  const url = renderPageHrefUrl(expr, (value, opts) => {
    const exprCode = getCodeExpressionWithFallback(
      asCode(value, exprCtx),
      exprCtx
    );
    if (opts.encode) {
      return "${" + encodeUrlSegmentAsCode(exprCode, opts) + "}";
    } else {
      return "${" + exprCode + "}";
    }
  });
  assert(url != null, "PageHref is expected to contain a page");
  return "(`" + url + "`)";
}

export interface EvalPageHrefProps {
  expr: PageHref;
  exprCtx: ExprCtx;
  canvasEnv: Record<string, any>;
}

/**
 * Evaluates a PageHref to a URL.
 * Fails if a required path param is missing or evaluates to an empty value.
 */
export function evalPageHrefPath({
  expr,
  exprCtx,
  canvasEnv,
}: EvalPageHrefProps): TryEvalExprResult {
  const pageMeta = ensure(
    expr.page.pageMeta,
    "PageHref is expected to contain a page"
  );
  for (const param of extractPathParamMetas(pageMeta)) {
    if (!param.required) {
      continue;
    }
    const value = expr.params[param.key];
    if (!value || exprToInterpolatedString(value) === "") {
      return {
        val: undefined,
        err: new Error(`Required path param "${param.key}" is empty`),
      };
    }
  }
  const code = pageHrefPathToCode({ expr, exprCtx });
  return tryEvalExpr(code, canvasEnv);
}

export function isCatchallParam(paramKey: string): boolean {
  return paramKey.startsWith("...");
}
