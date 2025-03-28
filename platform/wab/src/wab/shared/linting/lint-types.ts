import {
  Component,
  DataSourceOpExpr,
  Param,
  TplNode,
  VariantSetting,
} from "@/wab/shared/model/classes";
import { TplVisibility } from "@/wab/shared/visibility-utils";

interface BaseLintIssue {
  key: string;
}

export interface SuboptimalVariantedVisibilityLintIssue extends BaseLintIssue {
  type: "suboptimal-varianted-visibility";
  component: Component;
  tpl: TplNode;
  vs: VariantSetting;
  fix: TplVisibility;
}

export interface NonCssScreenVariantOverrideLintIssue extends BaseLintIssue {
  type: "non-css-screen-variant-override";
  component: Component;
  tpl: TplNode;
  vs: VariantSetting;
  prop:
    | { type: "attr"; attr: string }
    | { type: "arg"; param: Param }
    | { type: "text" };
}

export interface InvalidTplNestingLintIssue extends BaseLintIssue {
  type: "invalid-tpl-nesting";
  ancestorComponent?: Component;
  ancestorTpl: TplNode;
  component: Component;
  descendantTpl: TplNode;
}

export interface InvalidDomNestingLintIssue extends BaseLintIssue {
  type: "invalid-dom-nesting";
  ancestorComponent: Component;
  ancestorTpl: TplNode;
  component: Component;
  descendantTpl: TplNode;
}

export interface InvisibleElementLintIssue extends BaseLintIssue {
  type: "invisible-element";
  component: Component;
  tpl: TplNode;
}

export interface UnprotectedDataQueryLintIssue extends BaseLintIssue {
  type: "unprotected-data-query";
  component: Component;
  tpl?: TplNode;
  expr: DataSourceOpExpr;
  currentRole: string;
  expectedRole: string;
}

export type LintIssue =
  | NonCssScreenVariantOverrideLintIssue
  | SuboptimalVariantedVisibilityLintIssue
  | InvalidTplNestingLintIssue
  | InvalidDomNestingLintIssue
  | InvisibleElementLintIssue
  | UnprotectedDataQueryLintIssue;

export type LintIssueType = LintIssue["type"];
