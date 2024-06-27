import { ensureInstance } from "@/wab/shared/common";
import * as migration15 from "@/wab/server/bundle-migrations/15-remove-override";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { loadDepPackages } from "@/wab/server/db/DbBundleLoader";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";
import { Bundler } from "@/wab/shared/bundler";
import { UnsafeBundle } from "@/wab/shared/bundles";
import {
  ensureKnownVariant,
  isKnownSite,
  ProjectDependency,
  Site,
} from "@/wab/shared/model/classes";
import { TplMgr } from "@/wab/shared/TplMgr";

export async function migrate(
  bundle: UnsafeBundle,
  db: DbMgr,
  entity: PkgVersion | ProjectRevision
) {
  const tplByUuid = new Map<string, { __ref: string }>();
  for (const [iid, inst] of Object.entries(bundle.map)) {
    if (["TplTag", "TplComponent", "TplSlot"].includes(inst.__type)) {
      tplByUuid.set(inst["uuid"], { __ref: iid });
    }
  }
  // We might have deleted the tplNode but not the variant
  const variantsToDelete: string[] = [];
  for (const [iid, inst] of Object.entries(bundle.map)) {
    if (inst.__type === "Variant" && inst["forTpl"]) {
      const ref = tplByUuid.get(inst["forTpl"]);
      if (ref) {
        inst["forTpl"] = ref;
      } else {
        variantsToDelete.push(iid);
        // Temporarily mark the variant as not private to unbundle
        inst["forTpl"] = null;
      }
    }
  }

  if (variantsToDelete.length > 0) {
    // Unbundle to delete the variants and remove vsettings
    const deps = await loadDepPackages(db, bundle);
    const bundler = new Bundler();

    // HACK: This migration has been merged with the next one
    // which removes a field. Since we check the fields when
    // unbundling, we can only unbundle after the fields are consistent
    // so we will run the next migration before we unbundle
    const unbundle = (bundle2: UnsafeBundle, id: string) => {
      migration15.migrate(bundle2);
      return bundler.unbundle(bundle2, id);
    };

    deps.forEach((dep) => unbundle(JSON.parse(dep.model), dep.id));
    const siteOrProjectDep = ensureInstance(
      unbundle(bundle, entity.id),
      Site,
      ProjectDependency
    );
    const site = isKnownSite(siteOrProjectDep)
      ? siteOrProjectDep
      : siteOrProjectDep.site;
    const tplMgr = new TplMgr({ site });
    variantsToDelete.forEach((iid) => {
      const variant = ensureKnownVariant(
        bundler.objByAddr({ uuid: entity.id, iid })
      );
      tplMgr.tryRemoveVariant(
        variant,
        site.components.find(
          (c) =>
            c.variants.includes(variant) ||
            !!c.variantGroups.find((group) => group.variants.includes(variant))
        )
      );
    });
    const newBundle = bundler.bundle(
      siteOrProjectDep,
      entity.id,
      "14-update-forTpl"
    );
    Object.assign(bundle, newBundle);
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
