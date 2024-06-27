/**
 * Our check for real code expression is very error prone since we only
 * check if the expression starts with `(`.
 * Ideally, we should have a specific expression for the data picker code.
 */
import { unexpected } from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import { isRealCodeExpr, isRealCodeExprEnsuringType } from "@/wab/shared/core/exprs";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { Bundler } from "@/wab/shared/bundler";
import {
  CustomCode,
  Expr,
  isKnownCollectionExpr,
  isKnownEventHandler,
  isKnownFunctionExpr,
  isKnownMapExpr,
  isKnownObjectPath,
} from "@/wab/shared/model/classes";
import { flattenTpls, isTplComponent } from "@/wab/shared/core/tpls";

export function hasSyntaxError(val: string) {
  try {
    new Function(val);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return true;
    }
  }
  return false;
}

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  const fixRealCodeExprInBodyExpr = (expr: Expr) => {
    if (!isRealCodeExprEnsuringType(expr) || isKnownObjectPath(expr)) {
      return expr;
    }
    if (hasSyntaxError(expr.code.slice(1, -1))) {
      const newCode = `(${expr.code})`;
      if (!hasSyntaxError(newCode.slice(1, -1))) {
        return new CustomCode({
          code: newCode,
          fallback: null,
        });
      }
    }
    return expr;
  };

  const tpls = site.components
    .filter((c) => !isCodeComponent(c))
    .flatMap((c) => flattenTpls(c.tplTree));
  for (const tpl of tpls) {
    if (
      isTplComponent(tpl) &&
      tpl.component.name === "plasmic-antd5-form-item"
    ) {
      const rulesArgs = tpl.vsettings
        .flatMap((vs) => vs.args)
        .filter((arg) => arg.param.variable.name === "rules");
      for (const arg of rulesArgs) {
        if (!isKnownCollectionExpr(arg.expr)) {
          continue;
        }
        for (const expr of arg.expr.exprs) {
          if (!isKnownMapExpr(expr) || !("custom" in expr.mapExpr)) {
            continue;
          }
          if (isRealCodeExpr(expr.mapExpr.custom)) {
            continue;
          }
          if (isKnownFunctionExpr(expr.mapExpr["custom"])) {
            expr.mapExpr["custom"].bodyExpr = fixRealCodeExprInBodyExpr(
              expr.mapExpr["custom"].bodyExpr
            );
          } else {
            console.log("function expr error: form rules", expr.mapExpr.custom);
            unexpected();
          }
        }
      }
    } else {
      const eventHandlerExprs = tpl.vsettings
        .flatMap((vs) => [
          ...vs.args.map((arg) => arg.expr),
          ...Object.values(vs.attrs),
        ])
        .filter((expr) => isKnownEventHandler(expr));
      for (const expr of eventHandlerExprs) {
        if (!isKnownEventHandler(expr)) {
          continue;
        }
        for (const interaction of expr.interactions) {
          if (interaction.actionName !== "customFunction") {
            continue;
          }
          for (const arg of interaction.args) {
            if (arg.name !== "customFunction" || isRealCodeExpr(arg.expr)) {
              continue;
            }
            if (isKnownFunctionExpr(arg.expr)) {
              arg.expr.bodyExpr = fixRealCodeExprInBodyExpr(arg.expr.bodyExpr);
            } else {
              console.log("function expr error: interaction", arg.expr);
              unexpected();
            }
          }
        }
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "153-fix-real-code-expr"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
