import { ensure } from "@/wab/shared/common";
import { removeFromArray } from "@/wab/commons/collections";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { Bundler } from "@/wab/shared/bundler";
import {
  isKnownNamedState,
  isKnownTplTag,
  NamedState,
} from "@/wab/shared/model/classes";
import { groupBy } from "lodash";

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
