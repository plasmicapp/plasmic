import { State } from "../../classes";
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
