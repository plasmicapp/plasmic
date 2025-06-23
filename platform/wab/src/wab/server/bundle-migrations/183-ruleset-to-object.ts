import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { BundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { joinCssValues } from "@/wab/shared/css/parse";

export const migrate: BundledMigrationFn = async (bundle) => {
  for (const key of Object.keys(bundle.map)) {
    const inst = bundle.map[key];
    if (inst.__type === "RuleSet") {
      inst.values = Object.fromEntries(
        inst.children.map((ruleRef) => {
          const rule = bundle.map[ruleRef.__ref];
          return [rule.name, joinCssValues(rule.name, rule.values)];
        })
      );
      delete inst["children"];
    }
  }

  for (const key of Object.keys(bundle.map)) {
    const inst = bundle.map[key];
    if (inst.__type === "Rule") {
      delete bundle.map[key];
    }
  }
};

export const MIGRATION_TYPE: BundleMigrationType = "bundled";
