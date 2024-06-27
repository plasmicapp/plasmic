import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { Bundler } from "@/wab/shared/bundler";
import {
  CustomCode,
  EventHandler,
  FunctionExpr,
  isKnownCustomCode,
  isKnownEventHandler,
  isKnownFunctionType,
} from "@/wab/shared/model/classes";
import { flattenTpls, isAttrEventHandler } from "@/wab/shared/core/tpls";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  const updateCustomFunctionActionToFunctionExpr = (expr: EventHandler) => {
    for (const interaction of expr.interactions) {
      if (interaction.actionName === "customFunction") {
        const customFunctionArg = interaction.args.find(
          (arg) => arg.name === "customFunction"
        );
        if (customFunctionArg && isKnownCustomCode(customFunctionArg.expr)) {
          customFunctionArg.expr = new FunctionExpr({
            bodyExpr: new CustomCode({
              code: customFunctionArg.expr.code.slice(1, -1),
              fallback: null,
            }),
            argNames: [],
          });
        }
      }
    }
  };

  for (const component of site.components) {
    for (const tpl of flattenTpls(component.tplTree)) {
      for (const vs of tpl.vsettings) {
        for (const [attr, expr] of Object.entries(vs.attrs)) {
          if (isAttrEventHandler(attr) && isKnownEventHandler(expr)) {
            updateCustomFunctionActionToFunctionExpr(expr);
          }
        }
        for (const arg of [...vs.args]) {
          if (
            isKnownFunctionType(arg.param.type) &&
            isKnownEventHandler(arg.expr)
          ) {
            updateCustomFunctionActionToFunctionExpr(arg.expr);
          }
        }
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "106-change-to-function-expr-for-custom-function"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
