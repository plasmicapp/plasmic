import { ApiAppRole } from "@/wab/shared/ApiSchema";
import { findAllDataSourceOpExpr } from "@/wab/shared/cached-selectors";
import { UnprotectedDataQueryLintIssue } from "@/wab/shared/linting/lint-types";
import { lintIssuesEquals } from "@/wab/shared/linting/lint-utils";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import {
  Component,
  DataSourceOpExpr,
  Site,
  TplNode,
} from "@/wab/shared/model/classes";

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
