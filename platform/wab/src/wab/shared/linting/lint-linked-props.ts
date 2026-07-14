import { flattenComponent } from "@/wab/shared/cached-selectors";
import { extractReferencedParam } from "@/wab/shared/core/exprs";
import {
  findAllInstancesOfComponent,
  isTplComponent,
} from "@/wab/shared/core/tpls";
import { isLinkCompatible } from "@/wab/shared/linked-props";
import { LinkedPropDriftLintIssue } from "@/wab/shared/linting/lint-types";
import { lintIssuesEquals } from "@/wab/shared/linting/lint-utils";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import {
  Arg,
  Component,
  Param,
  Site,
  TplNode,
  isKnownVarRef,
} from "@/wab/shared/model/classes";

const TYPE = "linked-prop-drift";

export const lintLinkedProps = maybeComputedFn(
  function lintLinkedProps(site: Site) {
    const issues: LinkedPropDriftLintIssue[] = [];
    for (const comp of site.components) {
      issues.push(...lintComponent(comp));
    }
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintLinkedProps",
  }
);

const lintComponent = maybeComputedFn(
  function lintComponent(component: Component) {
    const issues: LinkedPropDriftLintIssue[] = [];
    for (const tpl of flattenComponent(component)) {
      if (!isTplComponent(tpl)) {
        continue;
      }
      for (const vs of tpl.vsettings) {
        for (const arg of vs.args) {
          const drift = driftedLinkIssue(component, tpl, arg);
          if (drift) {
            issues.push(drift.issue);
          }
        }
      }
    }
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintLinkedPropsComponent",
  }
);

function makeIssueKey(component: Component, tpl: TplNode, propName: string) {
  return `${TYPE}-${component.uuid}-${tpl.uuid}-${propName}`;
}

/**
 * Returns the drift issue for a single arg's link, if it's out of sync + the outer
 * param it is linked to
 */
function driftedLinkIssue(
  outerComponent: Component,
  tpl: TplNode,
  arg: Arg
): { issue: LinkedPropDriftLintIssue; outerParam: Param } | undefined {
  if (!isKnownVarRef(arg.expr)) {
    return undefined;
  }
  const outerParam = extractReferencedParam(outerComponent, arg.expr);
  if (!outerParam || isLinkCompatible(arg.param.type, outerParam.type)) {
    return undefined;
  }
  return {
    outerParam,
    issue: {
      key: makeIssueKey(outerComponent, tpl, arg.param.variable.name),
      type: TYPE,
      component: outerComponent,
      tpl,
      propName: arg.param.variable.name,
    },
  };
}

/**
 * Returns drift issues caused by editing a linked prop
 */
export function findLinkedPropIssuesForParam(
  site: Site,
  component: Component,
  param: Param
): LinkedPropDriftLintIssue[] {
  const issues: LinkedPropDriftLintIssue[] = [];
  const seen = new Set<string>();
  const record = (issue: LinkedPropDriftLintIssue) => {
    if (!seen.has(issue.key)) {
      seen.add(issue.key);
      issues.push(issue);
    }
  };

  // `param` as the inner: instances of `component` forward it out.
  for (const { referencedComponent: outer, tpl } of findAllInstancesOfComponent(
    site,
    component
  )) {
    for (const vs of tpl.vsettings) {
      for (const arg of vs.args) {
        if (arg.param !== param) {
          continue;
        }
        const drift = driftedLinkIssue(outer, tpl, arg);
        if (drift) {
          record(drift.issue);
        }
      }
    }
  }

  // `param` as the outer: instances inside `component` link to it.
  for (const tpl of flattenComponent(component)) {
    if (!isTplComponent(tpl)) {
      continue;
    }
    for (const vs of tpl.vsettings) {
      for (const arg of vs.args) {
        const drift = driftedLinkIssue(component, tpl, arg);
        if (drift?.outerParam === param) {
          record(drift.issue);
        }
      }
    }
  }

  return issues;
}
