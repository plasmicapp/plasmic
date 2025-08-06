import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { loadDepPackages } from "@/wab/server/db/DbBundleLoader";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { PkgVersion } from "@/wab/server/entities/Entities";
import { Bundler } from "@/wab/shared/bundler";
import { assert, ensure } from "@/wab/shared/common";
import { cloneType } from "@/wab/shared/core/tpls";
import { Param } from "@/wab/shared/model/classes";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  // Unbundle Site / ProjectDependency:
  const base = undefined as PkgVersion | undefined;
  if (!base) {
    return;
  }
  const deps = await loadDepPackages(db, bundle);
  const bundler = new Bundler();
  bundler.unbundle(JSON.parse(base.model), base.id);
  deps.forEach((dep) => bundler.unbundle(JSON.parse(dep.model), dep.id));
  const unbundled = bundler.unbundle(bundle, entity.id)!;

  // Now we we find all instances that reference types and clone those types,
  // so they will reference new internal instances.
  Object.entries(bundle.map).forEach(([iid, json]) => {
    if (["Param", "Cell", "Binding"].includes(json.__type)) {
      const inst = ensure(
        bundler.objByAddr({ iid, uuid: entity.id }),
        "must exist"
      ) as Param;
      inst.type = inst.type && cloneType(inst.type);
    } else if (["Collection", "MapType", "OpaqueType"].includes(json.__type)) {
      const inst = ensure(
        bundler.objByAddr({ iid, uuid: entity.id }),
        "must exist"
      ) as any;
      inst.params = inst.params.map(cloneType);
    } else if (json.__type === "Optional") {
      const inst = ensure(
        bundler.objByAddr({ iid, uuid: entity.id }),
        "must exist"
      ) as any;
      inst.param = cloneType(inst.param);
    }
  });

  // Now, bundle the site again and update the bundle
  const newBundle = bundler.bundle(unbundled, entity.id, "6-remove-base-types");
  assert(
    !newBundle.deps.find((str) => str === base.id),
    "Migrated bundle is still referencing basePkg!"
  );
  Object.assign(bundle, newBundle);
};

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
