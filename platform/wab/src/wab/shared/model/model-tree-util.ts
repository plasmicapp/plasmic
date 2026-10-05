import { Bundler } from "@/wab/shared/bundler";
import {
  assert,
  isLiteralObject,
  isPrimitive,
  tuple,
  unexpected,
} from "@/wab/shared/common";
import { instUtil } from "@/wab/shared/model/InstUtil";
import { ObjInst, Site } from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import { isWeakRefField } from "@/wab/shared/model/model-meta";

export function assertSameInstType(inst: ObjInst, ...others: ObjInst[]) {
  const cls = instUtil.getInstClass(inst);
  others.forEach((other) => {
    assert(
      cls === instUtil.getInstClass(other),
      () =>
        `Types mismatch: ${cls.name}  and ${instUtil.getInstClassName(other)}`,
    );
  });
}

export function areSameInstType(inst: any, ...others: any[]) {
  if (!instUtil.isObjInst(inst)) {
    return false;
  }
  const cls = instUtil.getInstClass(inst);
  return others.every(
    (other) => other && cls === instUtil.tryGetInstClass(other),
  );
}

export function walkModelTree(aCtx: NodeCtx, walked = new Array<ObjInst>()) {
  const inst = aCtx.node;
  assert(inst, "inst must be defined");
  walkInst(inst, walked);
  return walked;
}

function walkInst(inst: ObjInst, walked: ObjInst[]) {
  const cls = instUtil.getInstClass(inst);
  walked.push(inst);
  for (const field of meta.allFields(cls)) {
    if (!isWeakRefField(field)) {
      walkFieldValue(inst[field.name], walked);
    }
  }
}

function walkFieldValue(val: any, walked: ObjInst[]): void {
  if (isPrimitive(val)) {
    return;
  } else if (Array.isArray(val)) {
    return val.forEach((_v, i) => walkFieldValue(val[i], walked));
  } else if (isLiteralObject(val)) {
    return Object.keys(val).forEach((k) => walkFieldValue(val[k], walked));
  } else if (instUtil.isObjInst(val)) {
    return walkInst(val, walked);
  } else {
    unexpected();
  }
}

export function cowalkModelTrees(
  aCtx: NodeCtx,
  bCtx: NodeCtx,
  bundler: Bundler,
  updates = new Map<ObjInst, ObjInst>(),
): Map<ObjInst, ObjInst> {
  const { node: origInst, path: origPath } = aCtx;
  const { node: updatedInst, path: updatedPath } = bCtx;

  assert(origInst && updatedInst, "instances must exist");
  const cls = instUtil.getInstClass(origInst);
  assertSameInstType(origInst, updatedInst);

  updates.set(origInst, updatedInst);

  for (const field of meta.allFields(cls)) {
    if (isWeakRefField(field)) {
      continue;
    }
    const rec = (_aCtx: NodeCtx, _bCtx: NodeCtx) => {
      const { node: origVal } = _aCtx;
      const { node: updatedVal } = _bCtx;

      if (isPrimitive(origVal)) {
        return;
      } else if (Array.isArray(origVal)) {
        assert(
          Array.isArray(updatedVal),
          () => `Expected field values to be equivalent`,
        );
        return origVal.forEach((v, i) =>
          rec(nextCtx(_aCtx, `${i}`), nextCtx(_bCtx, `${i}`)),
        );
      } else if (isLiteralObject(origVal)) {
        assert(
          isLiteralObject(updatedVal),
          () => `Expected field values to be equivalent`,
        );
        const keys = [...Object.keys(origVal)];
        return keys.forEach((k) => rec(nextCtx(_aCtx, k), nextCtx(_bCtx, k)));
      } else if (instUtil.isObjInst(origVal)) {
        return cowalkModelTrees(_aCtx, _bCtx, bundler, updates);
      } else {
        unexpected();
      }
    };
    const origFieldCtx = nextCtx(aCtx, field.name);
    const updatedFieldCtx = nextCtx(bCtx, field.name);
    rec(origFieldCtx, updatedFieldCtx);
  }

  return updates;
}

export interface NodeCtx<T extends ObjInst = ObjInst> {
  node: T | undefined;
  site: Site;
  path: string[];
  /**
   * keyPath mirrors path, but for arrays, instead of using the index, we use the "key".
   * Since this only applies to arrays, and possibly later only certain arrays,
   * we allow this to be undefined, which it will usually be (it will be sparse).
   *
   * As such, it is not a required field, and is expected to be lazily padded to be the
   * same length as path when it comes time to extract the keyPath.
   */
  keyPath?: (string | undefined)[];
}

export function createNodeCtx(site: Site): NodeCtx<Site> {
  return {
    node: site,
    path: [],
    site,
    keyPath: [],
  };
}

export type NodeFieldCtx = Omit<NodeCtx, "node"> & { node: any };

export function nextCtx(
  ctx: NodeFieldCtx,
  field: string,
  key?: string,
): NodeFieldCtx {
  const prevKeyPath = ctx.keyPath ?? [];
  const len = Math.max(ctx.path.length, prevKeyPath.length);
  const keyPath = new Array<string | undefined>(len + 1);
  for (let i = 0; i < len; i++) {
    keyPath[i] = prevKeyPath[i];
  }
  keyPath[len] = key;
  return {
    site: ctx.site,
    node: ctx.node?.[field],
    path: [...ctx.path, field],
    keyPath,
  };
}

export function toJson(inst: ObjInst, bundler: Bundler) {
  const cls = instUtil.getInstClass(inst);
  const addr = bundler.addrOfUnsafe(inst);
  return {
    __iid: addr.iid,
    __type: cls.name,
    ...Object.fromEntries(
      meta
        .allFields(cls)
        .filter((field) => !field.annotations.includes("Transient"))
        .map((field) => {
          const rec = (_ctx: NodeCtx) => {
            const { node: origVal } = _ctx;

            if (isPrimitive(origVal)) {
              return origVal;
            } else if (Array.isArray(origVal)) {
              return origVal.map((v, i) => rec(nextCtx(_ctx, `${i}`)));
            } else if (isLiteralObject(origVal)) {
              const keys = [...Object.keys(origVal)];
              return Object.fromEntries(
                keys.map((k) => tuple(k, rec(nextCtx(_ctx, k)))),
              );
            } else if (instUtil.isObjInst(origVal)) {
              const origAddr = bundler.addrOfUnsafe(origVal);
              return isWeakRefField(field)
                ? {
                    __iidRef: origAddr.iid,
                    __uuid:
                      origAddr.uuid === addr.uuid ? undefined : origAddr.uuid,
                  }
                : toJson(origVal, bundler);
            } else {
              unexpected();
            }
          };
          return tuple(
            field.name,
            rec(nextCtx(createNodeCtx(inst as any), field.name)),
          );
        }),
    ),
  };
}
