import { assert } from "@/wab/shared/common";
import { extractParamsFromPagePath } from "@/wab/shared/core/components";
import {
  asCode,
  ExprCtx,
  getCodeExpressionWithFallback,
} from "@/wab/shared/core/exprs";
import { tryEvalExpr, TryEvalExprResult } from "@/wab/shared/eval";
import { PageHref } from "@/wab/shared/model/classes";
import { matchesPagePath } from "@plasmicapp/loader-react";

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
      path = substitutePathFragment(path, `[[${key}]]`, value || "");
    } else if (path.includes(`[${key}]`)) {
      // if value is empty string, keep the placeholder so the path is still valid
      if (value) {
        if (key.startsWith("...")) {
          // For catchall, value is already a valid url fragment
          path = substitutePathFragment(path, `[${key}]`, value);
        } else {
          path = path.replace(`[${key}]`, encodeURIComponent(value));
        }
      }
    }
  }
  // Replace optional catchall that still exist with ""
  const remainingParams = extractParamsFromPagePath(path);
  for (const param of remainingParams) {
    if (param.startsWith("...") && path.includes(`[[${param}]]`)) {
      path = path.replace(`[[${param}]]`, "");
    }
  }
  return path;
}

function substitutePathFragment(
  template: string,
  marker: string,
  value: string
) {
  // Remove starting and ending `/` from value
  value = value.replace(/^\/|\/$/g, "");
  return template.replace(marker, value);
}

/**
 * If `lookup` URI does not match `pagePath`, returns `false`.
 * Otherwise, returns param values. Param values are always returned as
 * strings, even for catchall params. However, param keys start with
 * "..." in such cases. Example:
 *
 * `getMatchingPagePathParams("/hello/[...catchall]/[slug]", "/hello/a/b/c")`
 * returns `{ "...catchall": "a/b", "slug": "c" }`.
 */
export function getMatchingPagePathParams(
  pagePath: string,
  lookup: string
): Record<string, string> | false {
  const match = matchesPagePath(pagePath, lookup);
  if (!match) {
    return false;
  }

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(match.params)) {
    if (Array.isArray(value)) {
      params[`...${key}`] = value.join("/");
    } else {
      params[key] = value;
    }
  }

  return params;
}

interface GetPageHrefPathProps {
  expr: PageHref;
  exprCtx: ExprCtx;
}

/**
 * Converts a PageHref expr to path/URL with.
 * Includes path params, query params, and fragment rendered as code.
 */
export function pageHrefPathToCode({
  expr,
  exprCtx,
}: GetPageHrefPathProps): string {
  assert(expr.page.pageMeta, "PageHref is expected to contain a page");

  const valueToCode = (value) => {
    const exprCode = getCodeExpressionWithFallback(
      asCode(value, exprCtx),
      exprCtx
    );
    return "${" + exprCode + "}";
  };

  let path = expr.page.pageMeta.path;
  for (const [key, value] of Object.entries(expr.params)) {
    const valueExpr = valueToCode(value);
    path = path.replace(`[[${key}]]`, valueExpr).replace(`[${key}]`, valueExpr);
  }
  const queryEntries = Object.entries(expr.query || {});
  if (queryEntries.length > 0) {
    const qs = queryEntries
      .map(([key, value]) => {
        const valueExpr = valueToCode(value);
        return `${encodeURIComponent(key)}=${valueExpr}`;
      })
      .join("&");

    path += `?${qs}`;
  }
  if (expr.fragment != null) {
    const fragExpr = valueToCode(expr.fragment);
    path += `#${fragExpr}`;
  }
  return "(`" + path + "`)";
}

export interface EvalPageHrefProps {
  expr: PageHref;
  exprCtx: ExprCtx;
  canvasEnv: Record<string, any>;
}

export function evalPageHrefPath({
  expr,
  exprCtx,
  canvasEnv,
}: EvalPageHrefProps): TryEvalExprResult {
  const code = pageHrefPathToCode({ expr, exprCtx });
  return tryEvalExpr(code, canvasEnv);
}
