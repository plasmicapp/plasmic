import { Component, DataSourceOpExpr, Site, TplNode } from "../../classes";
import { ApiAppRole } from "../ApiSchema";
import { findAllDataSourceOpExpr } from "../cached-selectors";
import { maybeComputedFn } from "../mobx-util";
import { UnprotectedDataQueryLintIssue } from "./lint-types";
import { lintIssuesEquals } from "./lint-utils";

const TYPE = "unprotected-data-query";

export const lintSite = maybeComputedFn(
  function lintSite(site: Site, roles: ApiAppRole[]) {
    const defaultPageRoleId = site.defaultPageRoleId;
    const defaultPageRoleOrder =
      roles.find((r) => r.id === defaultPageRoleId)?.order ?? 0;
    const dataSourceExprs = findAllDataSourceOpExpr(site);
    const issues: UnprotectedDataQueryLintIssue[] = dataSourceExprs
      .filter(({ expr }) => {
        const exprOrder = roles.find((r) => r.id === expr.roleId)?.order ?? 0;
        return exprOrder < defaultPageRoleOrder;
      })
      .flatMap(({ component, expr, node }) => ({
        key: makeIssueKey(component, expr, node),
        type: TYPE,
        component,
        tpl: node,
        expr,
        currentRole:
          roles.find((r) => r.id === expr.roleId)?.name ?? "Anonymous",
        expectedRole: roles.find((r) => r.id === defaultPageRoleId)?.name ?? "",
      }));
    return issues;
  },
  {
    keepAlive: false,
    equals: lintIssuesEquals,
    name: "lintUnprotectedDataQueries",
  }
);

function makeIssueKey(
  component: Component,
  expr: DataSourceOpExpr,
  tpl?: TplNode
) {
  return `${TYPE}-${component.uuid}-${expr.uid}-${tpl?.uuid}`;
}
