import { Site } from "@/wab/classes";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import { lintSite as lintInvalidNesting } from "./invalid-nesting/lint-invalid-nesting-tpl";
import { lintSite as lintInvisibleElements } from "./lint-invisible-elements";
import { lintSite as lintScreenVariantOverrides } from "./lint-screen-variant-overrides";
import { LintIssue } from "./lint-types";

export function lintIssuesEquals(prev: LintIssue[], next: LintIssue[]) {
  if (prev.length !== next.length) {
    return false;
  }
  for (let i = 0; i < prev.length; i++) {
    if (prev[i].key !== next[i].key) {
      return false;
    }
  }
  return true;
}

export const lintSite = maybeComputedFn(
  function lintSite(site: Site) {
    const issues: LintIssue[] = [];
    issues.push(...lintScreenVariantOverrides(site));
    issues.push(...lintInvalidNesting(site));
    issues.push(...lintInvisibleElements(site));
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintSite",
  }
);
