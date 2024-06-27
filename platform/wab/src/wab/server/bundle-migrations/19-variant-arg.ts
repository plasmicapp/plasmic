import { assert, ensure, ensureInstance } from "@/wab/shared/common";
import { DeepReadonly } from "@/wab/commons/types";
import { findVariantGroupForParam } from "@/wab/shared/core/components";
import { tryExtractJson } from "@/wab/shared/core/exprs";
import { BundleMigrationType } from "@/wab/server/db/bundle-migration-utils";
import { UnbundledMigrationFn } from "@/wab/server/db/BundleMigrator";
import { loadDepPackages } from "@/wab/server/db/DbBundleLoader";
import { Bundler } from "@/wab/shared/bundler";
import {
  Arg,
  Component,
  isKnownTplComponent,
  ProjectDependency,
  Site,
  Variant,
  VariantGroup,
  VariantsRef,
} from "@/wab/shared/model/classes";
import { isArray } from "lodash";

export const migrate: UnbundledMigrationFn = async (bundle, db, entity) => {
  const tplIids: string[] = [];
  for (const [iid, json] of Object.entries(bundle.map)) {
    if (json.__type === "TplComponent") {
      tplIids.push(iid);
    }
  }

  const deps = await loadDepPackages(db, bundle);
  const bundler = new Bundler();

  deps.forEach((dep) => bundler.unbundle(JSON.parse(dep.model), dep.id));
  const siteOrProjectDep = ensureInstance(
    bundler.unbundle(bundle, entity.id),
    Site,
    ProjectDependency
  );

  for (const iid of tplIids) {
    const tpl = bundler.objByAddr({ iid, uuid: entity.id });
    if (tpl) {
      assert(isKnownTplComponent(tpl), "must be TplComponent");
      for (const vs of tpl.vsettings) {
        for (const arg of vs.args) {
          const r = ensureInstance(
            rawTryGetVariantGroupValueFromArg(tpl.component, arg),
            GoodArg,
            NotVariantGroupParam
          );
          if (r instanceof GoodArg) {
            arg.expr = new VariantsRef({ variants: r.variants });
          }
        }
      }
    }
  }

  const newBundle = bundler.bundle(
    siteOrProjectDep,
    entity.id,
    "17-duplicated-rules"
  );
  Object.assign(bundle, newBundle);
};

// Old methods:
class NotVariantGroupParam {}

class CardinalityError {
  constructor(readonly vg: VariantGroup, readonly val: any) {}
}

class BadVariantRef {
  constructor(
    readonly vg: VariantGroup,
    readonly invalidUuids: string[],
    readonly variants: Variant[],
    readonly val: any
  ) {}
}

class GoodArg {
  constructor(
    readonly vg: VariantGroup,
    readonly variants: Variant[],
    readonly val: any
  ) {}
}

function tryParseVariantGroupArg(arg: DeepReadonly<Arg>, vg: VariantGroup) {
  const val = ensure(tryExtractJson(arg.expr), "");
  if (vg.multi) {
    const badUuids: string[] = [];
    const variants: Variant[] = [];
    if (!isArray(val)) {
      return new CardinalityError(vg, val);
    }
    const uuids = val as string[];
    uuids.forEach((uuid) => {
      const v = vg.variants.find((v2) => v2.uuid === uuid);
      if (v) {
        variants.push(v);
      } else {
        badUuids.push(uuid);
      }
    });
    if (badUuids.length > 0) {
      return new BadVariantRef(vg, badUuids, variants, val);
    }
    return new GoodArg(vg, variants, val);
  } else {
    if (isArray(val)) {
      return new CardinalityError(vg, val);
    }
    const uuid = val as string | null;
    if (uuid === null) {
      return new GoodArg(vg, [], val);
    }
    const v = vg.variants.find((v2) => v2.uuid === uuid);
    if (v) {
      return new GoodArg(vg, [v], val);
    } else {
      return new BadVariantRef(vg, [uuid], [], val);
    }
  }
}

// Return variants enabled by arg. undefined means arg is not pointing to a
// variant group.
function rawTryGetVariantGroupValueFromArg(
  component: Component,
  arg: Arg
): NotVariantGroupParam | BadVariantRef | GoodArg | CardinalityError {
  const vg = findVariantGroupForParam(component, arg.param);
  if (!vg) {
    return new NotVariantGroupParam();
  }
  return tryParseVariantGroupArg(arg, vg);
}

export const MIGRATION_TYPE: BundleMigrationType = "unbundled";
