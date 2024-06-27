import { ensure } from "@/wab/shared/common";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { Bundler } from "@/wab/shared/bundler";
import { toVarName } from "@/wab/shared/codegen/util";
import { State } from "@/wab/shared/model/classes";
import { renameObjectInExpr } from "@/wab/shared/refactoring";
import { getStateVarName } from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";

export function getOldStateVarName(state: State) {
  const tpls: string[] = [];
  let s = state;
  while (s.tplNode) {
    const dataReps = Tpls.ancestorsUp(s.tplNode).filter(
      Tpls.isTplRepeated
    ).length;
    tpls.push(
      `${toVarName(
        ensure(s.tplNode.name, "TplNode with public states must be named")
      )}${"[]".repeat(dataReps)}`
    );
    if (s.implicitState) {
      s = s.implicitState;
    } else {
      break;
    }
  }
  return [...tpls, toVarName(s.param.variable.name)].join(".");
}

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  for (const component of site.components) {
    for (const state of component.states) {
      const oldName = getOldStateVarName(state);
      const newName = getStateVarName(state);
      if (oldName === newName) {
        continue;
      }

      for (const { expr } of Tpls.findExprsInComponent(component)) {
        renameObjectInExpr(expr, "$state", "$state", oldName, newName);
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "111-update-implicit-implicit-states"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
