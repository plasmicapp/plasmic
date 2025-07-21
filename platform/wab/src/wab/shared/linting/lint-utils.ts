import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { lintInvalidNesting } from "@/wab/shared/linting/invalid-nesting/lint-invalid-nesting-tpl";
import { lintChoicePropValues } from "@/wab/shared/linting/lint-choice-prop-values";
import { lintInvisibleElements } from "@/wab/shared/linting/lint-invisible-elements";
import { lintScreenVariantOverrides } from "@/wab/shared/linting/lint-screen-variant-overrides";
import { LintIssue } from "@/wab/shared/linting/lint-types";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import { Site } from "@/wab/shared/model/classes";

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
  function lintSite(site: Site, studioCtx: StudioCtx) {
    const issues: LintIssue[] = [];
    issues.push(...lintScreenVariantOverrides(site));
    issues.push(...lintInvalidNesting(site));
    issues.push(...lintInvisibleElements(site));
    issues.push(...lintChoicePropValues(site, studioCtx));
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintSite",
  }
);
