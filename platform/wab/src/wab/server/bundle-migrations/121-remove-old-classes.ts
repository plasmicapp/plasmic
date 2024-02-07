import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";

// migrates plasmic-sanity-io, plasmic-content-stack
export const migrate: UnbundledMigrationFn = async (bundle) => {
  for (const [key, inst] of [...Object.entries(bundle.map)]) {
    const deletedTypes = [
      "DateTime",
      "Id",
      "Binary",
      "Collection",
      "MapType",
      "Optional",
      "Union",
    ];
    const otherDeletedClasses = [
      "BlobRef",
      "ProjectDepLocalResource",
      "SiteFolder",
      "LocalPresets",
      "TplGroup",
      "Query",
      "ExprBinding",
      "Cell",
      "Let",
      "SimplePath",
      "Preset",
      "PresetGroup",
      "RestQuery",
      "FetcherQuery",
      "GraphqlQuery",
    ];
    if (deletedTypes.includes(inst.__type)) {
      inst.__type = "Any";
      delete inst.params;
      delete inst.param;
    }
    if (otherDeletedClasses.includes(inst.__type)) {
      delete bundle.map[key];
    }
    if (inst.__type === "Site") {
      // assert(inst.folders.length === 0, () => `Has folders`);
      // assert(inst.localResources.length === 0, () => `Has localResources`);
      delete inst.folders;
      delete inst.localResources;
    }
    if (["ComponentArena", "PageArena", "Arena"].includes(inst.__type)) {
      delete inst.parentFolder;
    }
    if (inst.__type === "Component") {
      // assert(inst.presetGroups.length === 0, () => `Has presetGroups`);
      // assert(inst.queries.length === 0, () => `Has queries`);
      delete inst.presetGroups;
      delete inst.queries;
    }
    if (inst.__type === "VariantSetting") {
      // assert(inst.dataLets.length === 0, () => `Has dataLets`);
      delete inst.dataLets;
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
