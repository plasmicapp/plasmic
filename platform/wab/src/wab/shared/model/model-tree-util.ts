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

export function walkModelTree(
  aCtx: NodeCtx<ObjInst>,
  walked = new Array<ObjInst>(),
) {
  const { node: inst } = aCtx;
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
  aCtx: NodeCtx<ObjInst>,
  bCtx: NodeCtx<ObjInst>,
  bundler: Bundler,
  updates = new Map<ObjInst, ObjInst>(),
): Map<ObjInst, ObjInst> {
  const { node: origInst } = aCtx;
  const { node: updatedInst } = bCtx;

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
          rec(_aCtx.child(`${i}`), _bCtx.child(`${i}`)),
        );
      } else if (isLiteralObject(origVal)) {
        assert(
          isLiteralObject(updatedVal),
          () => `Expected field values to be equivalent`,
        );
        const keys = [...Object.keys(origVal)];
        return keys.forEach((k) => rec(_aCtx.child(k), _bCtx.child(k)));
      } else if (instUtil.isObjInst(origVal)) {
        return cowalkModelTrees(_aCtx, _bCtx, bundler, updates);
      } else {
        unexpected();
      }
    };
    rec(aCtx.child(field.name), bCtx.child(field.name));
  }

  return updates;
}

const NO_PATH: readonly string[] = [];

/**
 * A value in a site's model tree, and the path to it.
 *
 * A child links to its parent instead of copying the path, because tree walks
 * create a NodeCtx per value but rarely read its path.
 */
export class NodeCtx<T = any> {
  private constructor(
    readonly site: Site,
    readonly node: T | undefined,
    private readonly parent: NodeCtx | undefined,
    // The field or array index that leads from the parent to this node.
    private readonly field: string,
    // The key of an array element, which identifies it across branches.
    private readonly key: string | undefined,
    // The full path of a root. Children don't read it.
    private readonly rootPath: readonly string[],
  ) {}

  static root(site: Site): NodeCtx<Site> {
    return NodeCtx.at({ site, node: site, path: [] });
  }

  /** A ctx for a node whose path is already known. */
  static at<T>({
    site,
    node,
    path,
  }: {
    site: Site;
    node: T | undefined;
    path: readonly string[];
  }): NodeCtx<T> {
    return new NodeCtx(site, node, undefined, "", undefined, path);
  }

  child(field: string, key?: string): NodeCtx {
    return new NodeCtx(
      this.site,
      (this.node as any)?.[field],
      this,
      field,
      key,
      NO_PATH,
    );
  }

  /** Field names and array indexes from the site to this node. */
  path(): string[] {
    return this.buildPath(false);
  }

  /**
   * Like path(), but with an array element's key in place of its index where
   * it has one. Unlike indexes, keys identify the same element in every
   * branch, so merges compare and match changes by this path.
   */
  keyedPath(): string[] {
    return this.buildPath(true);
  }

  private buildPath(keyed: boolean): string[] {
    const segments: string[] = [];
    let ctx: NodeCtx = this;
    for (; ctx.parent; ctx = ctx.parent) {
      segments.push((keyed ? ctx.key : undefined) ?? ctx.field);
    }
    segments.reverse();
    return ctx.rootPath.length ? [...ctx.rootPath, ...segments] : segments;
  }
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
          const rec = (origVal: any) => {
            if (isPrimitive(origVal)) {
              return origVal;
            } else if (Array.isArray(origVal)) {
              return origVal.map((v) => rec(v));
            } else if (isLiteralObject(origVal)) {
              const keys = [...Object.keys(origVal)];
              return Object.fromEntries(
                keys.map((k) => tuple(k, rec(origVal[k]))),
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
          return tuple(field.name, rec(inst[field.name]));
        }),
    ),
  };
}
