import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import {
  BundleMigrationType,
  unbundleSite,
} from "@/wab/server/db/bundle-migration-utils";
import { Bundler } from "@/wab/shared/bundler";
import {
  DataSourceTemplate,
  isKnownDataSourceOpExpr,
  isKnownTemplatedString,
} from "@/wab/shared/model/classes";
import { findExprsInComponent } from "@/wab/shared/core/tpls";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const bundler = new Bundler();
  const { site, siteOrProjectDep } = await unbundleSite(
    bundler,
    bundle,
    db,
    entity
  );

  for (const component of site.components) {
    for (const { expr } of findExprsInComponent(component)) {
      if (!isKnownDataSourceOpExpr(expr)) {
        continue;
      }

      for (const template of Object.values(expr.templates)) {
        fixDataSourceTemplate(template);
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "168-pg-data-source-remove-quotes"
  );
  Object.assign(bundle, newBundle);
};

function fixDataSourceTemplate(template: DataSourceTemplate) {
  if (isKnownTemplatedString(template.value)) {
    return;
  }

  const removeQuotesFromKeys = (obj: any) => {
    const newObject = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (key.startsWith(`"`) && key.endsWith(`"`)) {
        key = key.slice(1, -1);
      }
      newObject[key] = value;
    });
    return newObject;
  };

  if (template.fieldType === "json-schema") {
    const obj = JSON.parse(template.value);
    template.value = JSON.stringify(removeQuotesFromKeys(obj));
  } else if (template.fieldType === "json-schema[]") {
    const objects = JSON.parse(template.value) as any[];
    const newObjects = objects.map((obj) => removeQuotesFromKeys(obj));
    template.value = JSON.stringify(newObjects);
  } else if (template.fieldType === "filter[]") {
    template.value = template.value.replace(/"\\"/g, `"`);
    template.value = template.value.replace(/\\""/g, `"`);
  }
}

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
