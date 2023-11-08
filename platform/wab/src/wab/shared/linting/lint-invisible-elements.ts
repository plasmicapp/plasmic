import { Component, Site, TplNode } from "../../classes";
import { flattenComponent } from "../cached-selectors";
import { maybeComputedFn } from "../mobx-util";
import { isAlwaysInvisibleTpl } from "../visibility-utils";
import { InvisibleElementLintIssue } from "./lint-types";
import { lintIssuesEquals } from "./lint-utils";

const TYPE = "invisible-element";

export const lintSite = maybeComputedFn(
  function lintSite(site: Site) {
    const issues: InvisibleElementLintIssue[] = [];
    for (const comp of site.components) {
      issues.push(...lintComponent(comp));
    }
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintInvisibleElements",
  }
);

const lintComponent = maybeComputedFn(
  function lintComponent(component: Component) {
    const issues: InvisibleElementLintIssue[] = [];
    for (const tpl of flattenComponent(component)) {
      if (isAlwaysInvisibleTpl(tpl)) {
        issues.push({
          key: makeIssueKey(component, tpl),
          type: TYPE,
          tpl,
          component,
        });
      }
    }
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintInvisibleElementsComponent",
  }
);

function makeIssueKey(component: Component, tpl: TplNode) {
  return `${TYPE}-${component.uuid}-${tpl.uuid}`;
}
