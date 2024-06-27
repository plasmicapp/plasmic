import { ensure } from "@/wab/shared/common";
import { getAllComponentsInTopologicalOrder } from "@/wab/shared/core/components";
import { extractReferencedParam, isRealCodeExpr } from "@/wab/shared/core/exprs";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { Bundler } from "@/wab/shared/bundler";
import {
  Expr,
  isKnownEventHandler,
  isKnownFunctionType,
  isKnownVarRef,
} from "@/wab/shared/model/classes";
import { flattenTpls, isAttrEventHandler } from "@/wab/shared/core/tpls";
import { remove } from "lodash";
export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  const isExprValidForEventHandler = (expr: Expr | null | undefined) =>
    !expr ||
    isKnownEventHandler(expr) ||
    isRealCodeExpr(expr) ||
    isKnownVarRef(expr);

  for (const component of getAllComponentsInTopologicalOrder(site)) {
    for (const tpl of flattenTpls(component.tplTree)) {
      for (const vs of tpl.vsettings) {
        for (const [attr, expr] of [...Object.entries(vs.attrs)]) {
          if (!isAttrEventHandler(attr)) {
            continue;
          }
          if (isKnownVarRef(expr)) {
            const param = ensure(
              extractReferencedParam(component, expr),
              `param not found for var ref: ${expr.variable.name}`
            );
            if (!isExprValidForEventHandler(param.defaultExpr)) {
              param.defaultExpr = null;
            }
          }
          if (!isExprValidForEventHandler(expr)) {
            delete vs.attrs[attr];
          }
        }
        for (const arg of [...vs.args]) {
          if (isKnownFunctionType(arg.param.type)) {
            if (isKnownVarRef(arg.expr)) {
              const param = ensure(
                extractReferencedParam(component, arg.expr),
                `param not found for var ref: ${arg.expr.variable.name}`
              );
              if (!isExprValidForEventHandler(param.defaultExpr)) {
                param.defaultExpr = null;
              }
            }
            if (!isExprValidForEventHandler(arg.expr)) {
              remove(vs.args, arg);
            }
          }
        }
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "113-remove-invalid-event-handlers"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
