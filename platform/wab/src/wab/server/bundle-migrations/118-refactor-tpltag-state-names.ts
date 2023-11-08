import { isKnownNamedState, State } from "../../classes";
import { ensure } from "../../common";
import { Bundler } from "../../shared/bundler";
import { toVarName } from "../../shared/codegen/util";
import { renameObjectInExpr } from "../../shared/refactoring";
import { getStateVarName } from "../../states";
import * as Tpls from "../../tpls";
import {
  BundleMigrationType,
  unbundleSite,
} from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

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
