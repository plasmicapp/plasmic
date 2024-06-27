import { ensure } from "@/wab/shared/common";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { Bundler } from "@/wab/shared/bundler";
import { toVarName } from "@/wab/shared/codegen/util";
import { isKnownNamedState, State } from "@/wab/shared/model/classes";
import { renameObjectInExpr } from "@/wab/shared/refactoring";
import { getStateVarName } from "@/wab/shared/core/states";
import * as Tpls from "@/wab/shared/core/tpls";

function getOldLastPartOfImplicitStateName(state: State) {
  return isKnownNamedState(state.implicitState)
    ? state.implicitState.name
    : toVarName(
        state.implicitState?.param.variable.name ?? state.param.variable.name
      );
}

function getOldStateVarName(state: State) {
  if (state.tplNode) {
    const dataReps = Tpls.ancestorsUp(state.tplNode).filter(
      Tpls.isTplRepeated
    ).length;
    const tplName = toVarName(
      ensure(state.tplNode.name, "TplNode with public states must be named")
    );
    const stateName = toVarName(getOldLastPartOfImplicitStateName(state));
    return `${tplName}${"[]".repeat(dataReps)}.${stateName}`;
  } else {
    return toVarName(state.param.variable.name);
  }
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
    "118-refactor-tpltag-state-names"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
