import { groupBy } from "lodash";
import { isKnownNamedState, isKnownTplTag, NamedState } from "../../classes";
import { ensure } from "../../common";
import { removeFromArray } from "../../commons/collections";
import { Bundler } from "../../shared/bundler";
import {
  BundleMigrationType,
  unbundleSite,
} from "../db/bundle-migration-utils";
import { UnbundledMigrationFn } from "../db/BundleMigrator";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  for (const component of site.components) {
    const tplNodeToStates: Record<string, NamedState[]> = groupBy(
      component.states.filter(
        (s) => isKnownTplTag(s.tplNode) && isKnownNamedState(s)
      ) as NamedState[],
      (s) => ensure(s.tplNode, "Just filtered").uuid
    );
    for (const states of Object.values(tplNodeToStates)) {
      const seen = new Set<string>();
      for (const state of states) {
        if (seen.has(state.name)) {
          removeFromArray(component.states, state);
        } else {
          seen.add(state.name);
        }
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "147-remove-duplicate-implicit-states"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
