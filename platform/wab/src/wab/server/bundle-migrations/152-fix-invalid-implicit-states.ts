/**
 * Like 148, but deals with imported buttons too
 */
import { Bundler } from "../../shared/bundler";
import {
  ensureCorrectImplicitStates,
  removeComponentState,
} from "../../states";
import { isTplComponent } from "../../tpls";
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

  for (const comp of site.components) {
    for (const state of [...comp.states]) {
      if (
        state.implicitState &&
        isTplComponent(state.tplNode) &&
        !state.tplNode.component.states.includes(state.implicitState)
      ) {
        // We've found a state.implicitState that is no where to be found
        // in the owning component.states.  We may have gotten here
        // because someone used "swap all instances of this component"...
        // We will fix it for now by just removing the state entirely.
        // This may "break" some existing connections, but things were
        // already pretty broken to begin with.
        removeComponentState(site, comp, state);

        // Add back whatever implicit state this tplnode is supposed to have
        ensureCorrectImplicitStates(site, comp, state.tplNode);
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "151-fix-invalid-implicit-states"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
