/**
 * We had two prop editors that essentially represented the same thing: "function" and "functionBody".
 * After the refactoring work, we consolidated them into the same propType ("function")
 * but we need to perform a migration to ensure that they save the value in the same format.
 * Fortunately, these two were not part of the public API and were only used internally for
 * form validation rules and custom code in interactions.
 */
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { logger } from "@/wab/server/observability";
import { Bundler } from "@/wab/shared/bundler";
import { unexpected } from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import { isRealCodeExpr } from "@/wab/shared/core/exprs";
import { flattenTpls, isTplComponent } from "@/wab/shared/core/tpls";
import {
  CustomCode,
  Expr,
  isKnownCollectionExpr,
  isKnownCustomCode,
  isKnownEventHandler,
  isKnownFunctionExpr,
  isKnownMapExpr,
} from "@/wab/shared/model/classes";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  const fixFunctionExpr = (expr: Expr) => {
    if (isRealCodeExpr(expr)) {
      return expr;
    } else if (isKnownCustomCode(expr)) {
      return new CustomCode({
        code: `(${expr.code})`,
        fallback: expr.fallback,
      });
    } else {
      logger().info("error fixing expr", expr);
      unexpected();
    }
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
            expr.mapExpr["custom"].bodyExpr = fixFunctionExpr(
              expr.mapExpr["custom"].bodyExpr
            );
          } else {
            logger().info(
              "function expr error: form rules",
              expr.mapExpr.custom
            );
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
              arg.expr.bodyExpr = fixFunctionExpr(arg.expr.bodyExpr);
            } else {
              logger().info("function expr error: interaction", arg.expr);
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
    "151-fix-function-exprs"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
