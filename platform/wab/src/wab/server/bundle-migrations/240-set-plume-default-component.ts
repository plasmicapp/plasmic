import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";

export const migrate: BundledMigrationFn = async (bundle) => {
  // ProjectDependency objects cannot have default components
  if (bundle.map[bundle.root].__type === "ProjectDependency") {
    return;
  }

  // get the default components
  const root = bundle.map[bundle.root];

  // it might not be set, don't forget to set it later
  const defaultComponents = root.defaultComponents ?? {};

  // get list of default components to find
  const missingDefaultComponents = new Set(
    ["checkbox", "select", "switch", "button", "text-input"].filter(
      (type) => !(type in defaultComponents)
    )
  );
  if (missingDefaultComponents.size === 0) {
    return;
  }

  for (const [uid, inst] of Object.entries(bundle.map)) {
    // skip everything but Plume components
    if (!(inst.__type === "Component" && inst.plumeInfo)) {
      continue;
    }

    // ensure they have a Plume type
    const plumeType = bundle.map[inst.plumeInfo.__ref]?.type;
    if (!plumeType) {
      continue;
    }

    // check if it's a missing default components type
    if (!missingDefaultComponents.has(plumeType)) {
      continue;
    }

    // set the default component
    defaultComponents[plumeType] = {
      __ref: uid,
    };

    // try to early return if done
    missingDefaultComponents.delete(plumeType);
    if (missingDefaultComponents.size === 0) {
      return;
    }
  }

  // set default components if the object didn't previously exist
  // and default components were found
  if (!root.defaultComponents && Object.keys(defaultComponents).length > 0) {
    root.defaultComponents = defaultComponents;
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
