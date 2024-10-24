import {
  allSuccess,
  firstResult,
  mapAllSuccess,
  mapSomeSuccess,
} from "@/wab/commons/failable-utils";
import { DeepReadonly } from "@/wab/commons/types";
import { Bundle, BundledInst, UnsafeBundle } from "@/wab/shared/bundles";
import {
  assert,
  check,
  coalesce,
  ensure,
  ensureInstance,
  filterFalsy,
  isLiteralObject,
  maybe,
  mkMap,
  mkShortId,
  tuple,
  withoutNils,
  xSetDefault,
} from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { InstUtil } from "@/wab/shared/model/InstUtil";
import * as classesModule from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import {
  Field,
  MetaRuntime,
  Type,
  checkEqKeys,
  isStrongRefField,
  isWeakRefField,
  toTs,
} from "@/wab/shared/model/model-meta";
import { conformsToType } from "@/wab/shared/model/model-util";
import { flatten, isArray, isEmpty, isNil, isObject, uniq } from "lodash";
import { IFailable, failable } from "ts-failable";

export type { Bundle, BundledInst };

// Key requirements:
//
// Addrs are stable.  Hence must remember UID-to-Addr mappings (but don't need
// bundles) and also the max-IID for this bundle to continue generating them.
//
// Instances are stable.  Hence must remember intsances and merge-update the
// instance graph.

const isXref = (x: any) => isLiteralObject(x) && "__xref" in x;
const isAnyRef = (x: {}) => "__xref" in x || "__ref" in x;

interface Addr {
  iid: string;
  uuid: string;
}

export const addrKey = (xref: Addr) => `${xref.uuid} ${xref.iid}`;
const key2Addr = (key: string): Addr => {
  const vals = key.split(" ");
  return { uuid: vals[0], iid: vals[1] };
};
export const addrSlug = (xref: Addr) => `${xref.uuid}-${xref.iid}`;

type Ref = { __ref: string } | { __xref: Addr };

// Recursively visits a bundled field looking for internal and external Refs
function visitFieldRefs(valueOrRef: any, visitRef: (ref: Ref) => void) {
  if (Array.isArray(valueOrRef)) {
    valueOrRef.forEach((v) => visitFieldRefs(v, visitRef));
  } else if (isLiteralObject(valueOrRef)) {
    if ("__ref" in valueOrRef || "__xref" in valueOrRef) {
      visitRef(valueOrRef);
    } else {
      Object.values(valueOrRef).forEach((v) => visitFieldRefs(v, visitRef));
    }
  }
}

/**
 * Similar to `bundler._fieldVals`, but doesn't return anything and iterates
 * over a bundled instance, visiting all references to other instances
 */
export function visitRefsInFields(
  bundledInst: any,
  visitRef: (fieldRef: Ref, field: Field) => void,
  fields?: string[],
  rt = meta
) {
  const cls = ensure(
    meta.clsByName[bundledInst.__type],
    () => `Couldn't get class for type ${bundledInst.__type}`
  );
  rt.allFields(cls)
    .filter((f) => !fields || fields.includes(f.name))
    .forEach((field) =>
      visitFieldRefs(bundledInst[field.name], (ref) => visitRef(ref, field))
    );
}

export function checkExistingReferences(bundle: Bundle) {
  const map = bundle.map || {};
  const checkValueOrRef = (x: Ref) => {
    if ("__ref" in x) {
      assert(map[x.__ref], `Missing reference (IID ${x.__ref})`);
    } else {
      assert(
        bundle.deps.includes(x.__xref.uuid),
        () =>
          `Missing xref (${x.__xref.uuid}, ${
            x.__xref.iid
          }) (only know about: ${bundle.deps.sort().join(", ")})`
      );
    }
  };

  Object.values(map).forEach((json) => visitFieldRefs(json, checkValueOrRef));
}

export function getAllXRefs(bundle: Bundle) {
  const map = bundle.map || {};
  const xrefs: { __xref: Addr }[] = [];

  const checkRef = (x: Ref) => {
    if ("__xref" in x) {
      xrefs.push(x);
    }
  };

  Object.values(map).forEach((json) => visitFieldRefs(json, checkRef));

  return xrefs;
}

export function removeUnreachableNodesFromBundle(bundle: Bundle) {
  const queue = [bundle.root];
  const reachableIids = new Set([bundle.root]);

  const visitRef = (ref: Ref) => {
    if ("__ref" in ref) {
      const iid = ref.__ref;
      if (!reachableIids.has(iid)) {
        reachableIids.add(iid);
        queue.push(iid);
      }
    }
  };

  while (queue.length > 0) {
    const iid = queue.pop()!;
    visitFieldRefs(bundle.map[iid], visitRef);
  }

  Object.keys(bundle.map).forEach((iid) => {
    if (!reachableIids.has(iid)) {
      delete bundle.map[iid];
    }
  });
}

export function checkRefsInBundle(
  bundle: Bundle,
  opts?: {
    onWeakRefToUnreachableInst?: (opts: {
      referencedIid: string;
      weakRefParents: Map<string, { iid: string; field: string }[]>;
      strongRefParents: Map<string, { iid: string; field: string }[]>;
    }) => void;
    onStrongRefToXref?: (opts: {
      referencedXref: Addr;
      weakRefParents: Map<string, { iid: string; field: string }[]>;
      strongRefParents: Map<string, { iid: string; field: string }[]>;
    }) => void;
  }
) {
  const onWeakRefToUnreachableInst =
    opts?.onWeakRefToUnreachableInst ??
    (() => {
      // See the logs for all invalid refs!
      assert(false, () => `Unreachable instance has weak refs`);
    });
  const onStrongRefToXref =
    opts?.onStrongRefToXref ??
    (() => {
      // See the logs for all invalid refs!
      assert(false, () => `Xref has strong refs`);
    });
  const weakRefParents = new Map<string, { iid: string; field: string }[]>();
  const strongRefParents = new Map<string, { iid: string; field: string }[]>();
  const xref2strongRefParents = new Map<
    string,
    { iid: string; field: string }[]
  >();

  const getParents = <K, T>(parentMap: Map<K, T[]>, key: K): T[] =>
    xSetDefault(parentMap, key, () => []);

  const queue = [bundle.root];
  const reachableIids = new Set([bundle.root]);

  const visitRef = (parent: string, ref: Ref, field: Field) => {
    if ("__ref" in ref) {
      const iid = ref.__ref;
      if (!reachableIids.has(iid)) {
        reachableIids.add(iid);
        queue.push(iid);
      }
      if (isWeakRefField(field)) {
        getParents(weakRefParents, iid).push({
          iid: parent,
          field: field.name,
        });
      } else {
        getParents(strongRefParents, iid).push({
          iid: parent,
          field: field.name,
        });
      }
    } else if (isStrongRefField(field)) {
      getParents(xref2strongRefParents, addrKey(ref.__xref)).push({
        iid: parent,
        field: field.name,
      });
    }
  };

  while (queue.length > 0) {
    const iid = queue.pop()!;
    visitRefsInFields(bundle.map[iid], (ref, field) =>
      visitRef(iid, ref, field)
    );
  }
  const displayInst = (iid: string) => `${bundle.map[iid]?.__type}[${iid}]`;
  Object.keys(bundle.map).forEach((iid) => {
    if (
      getParents(weakRefParents, iid).length > 0 &&
      getParents(strongRefParents, iid).length === 0
    ) {
      console.log(
        `Invalid weak ref to unreachable instance ${displayInst(
          iid
        )}: ${getParents(weakRefParents, iid)
          .map(
            ({ iid: parentIid, field }) => `${displayInst(parentIid)}.${field}`
          )
          .join(", ")}`
      );
    }
  });

  [...xref2strongRefParents.entries()].forEach(([keyAddr, parents]) => {
    if (parents.length > 0) {
      console.log(`Invalid strong ref to xref ${keyAddr}`);
    }
  });
  Object.keys(bundle.map).forEach((iid) => {
    if (
      getParents(weakRefParents, iid).length > 0 &&
      getParents(strongRefParents, iid).length === 0
    ) {
      onWeakRefToUnreachableInst({
        referencedIid: iid,
        weakRefParents,
        strongRefParents,
      });
    }
  });

  [...xref2strongRefParents.entries()].forEach(([keyAddr, parents]) => {
    if (parents.length > 0) {
      onStrongRefToXref({
        referencedXref: key2Addr(keyAddr),
        weakRefParents,
        strongRefParents,
      });
    }
  });
}

export function checkBundleFields(bundle: Bundle, iidsToCheck?: string[]) {
  const map = bundle.map || {};

  function checkType(value: any, tp: Type): IFailable<true, string> {
    return failable<true, string>(({ success, failure }) => {
      switch (tp.type) {
        case "String":
          return typeof value === "string"
            ? success(true)
            : failure(`${value} is not a string`);
        case "StringLiteral":
          return value === tp.params[0]
            ? success(true)
            : failure(
                `${value} is not a string literal ${JSON.stringify(
                  tp.params[0]
                )}`
              );
        case "Number":
          return typeof value === "number"
            ? success(true)
            : failure(`${value} is not a number`);
        case "Bool":
          return typeof value === "boolean"
            ? success(true)
            : failure(`${value} is not a boolean`);
        case "List":
        case "Set":
          if (!Array.isArray(value)) {
            return failure(`${value} is not an array`);
          }
          return firstResult(
            mapAllSuccess(value, (item) =>
              checkType(item, ensureInstance(tp.params[0], Type))
            )
          );
        case "Lit":
          return ["number", "string"].includes(typeof value) ||
            value === null ||
            value === undefined
            ? success(true)
            : failure(`Lit must be number, string, null or undefined`);
        case "Optional":
          if (value !== null && value !== undefined) {
            return checkType(value, ensureInstance(tp.params[0], Type));
          } else {
            return success(true);
          }
        case "Map":
          if (!isLiteralObject(value)) {
            return failure(`${value} is not a plain object`);
          }
          return firstResult(
            mapAllSuccess(Array.from(Object.entries(value)), (pair) =>
              firstResult(
                allSuccess(
                  checkType(pair[0], ensureInstance(tp.params[0], Type)),
                  checkType(pair[1], ensureInstance(tp.params[1], Type))
                )
              )
            )
          );
        case "Or":
          return mapSomeSuccess(tp.params, (p) =>
            checkType(value, ensureInstance(p, Type))
          ).mapError(
            () =>
              `${JSON.stringify(value)} ${
                typeof value === "object" &&
                value &&
                "__ref" in value &&
                map[value.__ref]
                  ? `(${map[value.__ref].__type}) `
                  : ""
              }does not match any of the types ${tp.params.map((p) =>
                toTs(ensureInstance(p, Type))
              )}`
          );
        case "Any":
          return success(true);
        default: {
          if (isXref(value)) {
            // TODO: We do not validate xrefs at the moment.
            return success(true);
          }

          const refType = map[value.__ref]?.__type;

          const refCls = meta.clsByName[refType];
          if (!refCls) {
            return failure(
              `${JSON.stringify(map[value.__ref])} (referenced by (${
                tp.type
              }): ${JSON.stringify(value)}) has unknown type "${refType}"`
            );
          }
          const tpCls = ensure(
            meta.clsByName[tp.type],
            () => `Couldn't find class by name ${tp.type}`
          );
          return meta.isSubclass(refCls, tpCls)
            ? success(true)
            : failure(`Wrong type (got ${refType}, want ${tp.type})`);
        }
      }
    });
  }

  const errors: Array<{
    iid: string;
    field: string;
    error: Error;
  }> = [];

  iidsToCheck = iidsToCheck ?? Object.keys(map);
  for (const iid of iidsToCheck) {
    if (!(iid in map)) {
      continue;
    }
    const obj = map[iid];

    const cls = ensure(
      meta.clsByName[obj.__type],
      `Unknown type: ${obj.__type}`
    );

    checkEqKeys(
      obj,
      meta.allFieldKeys(cls),
      meta.allTransientFieldKeys(cls),
      obj.__type
    );

    const fields = meta.allFields(cls);
    for (const field of fields) {
      const checkResult = checkType(obj[field.name], field.type);
      if (checkResult.result.isError) {
        errors.push({
          iid,
          field: field.name,
          error: new Error(checkResult.result.error),
        });
      }
    }
  }

  if (errors.length) {
    throw new Error(
      "Type checking error\n" +
        errors
          .map(
            (e) =>
              `- iid: ${e.iid}, field: ${e.field}, error: ${e.error.message}`
          )
          .join("\n")
    );
  }
}

// TODO fix mem leak, should track entire bundles so that they can be wiped
export class Bundler {
  protected _rt: MetaRuntime;
  protected _instUtil: InstUtil;
  protected _realClasses;
  // Public for tests
  _addr2inst: { [k: string]: classesModule.ObjInst };
  // Public for tests
  _uid2addr: { [k: string]: Addr };
  private _uuid2root: Record<string, classesModule.ObjInst>;

  /**
   * looseMode means skip checking of fields and ignore missing xrefs (leaving the references in place)
   */
  constructor(rt = meta, classes = classesModule, private looseMode = false) {
    this._rt = rt;
    this._instUtil = new InstUtil(rt, classes.justClasses);
    this._realClasses = classes;
    // maps from Addr to latest deserialized instance graph; unbundle() uses
    // this
    this._addr2inst = mkMap();
    // maps from UID to Addr; bundle() uses this
    this._uid2addr = mkMap();
    // maps from UUID to root
    this._uuid2root = mkMap();
  }

  getNewIid = () => mkShortId();

  /**
   * Maps `visitInst` over the field values of the argument `inst`.
   *
   * Calls `visitInst` on all field values of the argument `inst` that are
   * instances of runtime classes.  If a field value is a List, Set or Map,
   * then members of those collections are also visited if they are also
   * instances of runtime classes.  Note this is not recursive; we only
   * go over the field values for the argument `inst`.
   *
   * The returned value is a list of tuples; first element is the field,
   * and second element is the result of calling `visitInst` on that field
   * value.  Field values that are not instances are left intact and
   * also returned; we just don't call `visitInst` on them.
   */
  protected _fieldVals(
    inst: classesModule.ObjInst,
    visitInst: (inst: classesModule.ObjInst, field: Field) => any,
    fields?: string[],
    opts?: { noTypeCheck?: boolean }
  ) {
    const cls = this._instUtil.getInstClass(inst);
    const maybeVisit = (x: {} | null | undefined, field: Field) => {
      if (x && this._instUtil.isObjInst(x)) {
        return visitInst(x as classesModule.ObjInst, field);
      } else {
        return x;
      }
    };
    return this._rt
      .allFields(cls)
      .filter(
        (f) =>
          (!fields || fields.includes(f.name)) &&
          !f.annotations.includes("Transient")
      )
      .map((f) => {
        const val = this._rt.readField(inst, f.name);
        if (!opts?.noTypeCheck) {
          assert(conformsToType(val, f.type, this._instUtil), () =>
            `Expected type ${toTs(f.type)} for field ${cls.name}.${
              f.name
            } value ${val} ${
              this._instUtil.isObjInst(val)
                ? `(${this._instUtil.getInstClassName(val)})`
                : ""
            }`.trim()
          );
        }
        if (f.type.type === "Optional" && (val === null || val === undefined)) {
          return tuple(f, val);
        } else if (isArray(val)) {
          return tuple(
            f,
            [...val].map((x) => maybeVisit(x, f))
          );
        } else if (isLiteralObject(val)) {
          return tuple(
            f,
            Object.fromEntries(
              Object.keys(val || {}).map((k) => {
                const v = val[k];

                return tuple(k, maybeVisit(v, f));
              })
            )
          );
        } else {
          return tuple(f, maybeVisit(val, f));
        }
      });
  }

  addrOf(obj: classesModule.ObjInst) {
    return this._uid2addr[obj.uid];
  }
  addrSlugOf(obj: classesModule.ObjInst) {
    return addrSlug(this.addrOf(obj));
  }
  objByAddr(addr: Addr) {
    return this._addr2inst[addrKey(addr)];
  }

  allIidsByUuid(uuid: string) {
    return [...Object.values(this._uid2addr)]
      .filter((addr) => addr.uuid === uuid)
      .map((addr) => addr.iid);
  }

  allUuids() {
    return Object.keys(this._uuid2root).sort();
  }

  // Extract the required bundle UUIDs.
  extractDependencies(bundle: Bundle) {
    return flatten(
      Object.keys(bundle.map || {}).map((iid) => {
        const json = bundle.map[iid];

        return [
          ...(function* () {
            for (const field in json) {
              const val = json[field];
              if (isXref(val)) {
                yield val.__xref.uuid;
              }
            }
          })(),
        ];
      })
    );
  }

  /**
   * Gathers all "internal" instances under the root tree.  Internal means that
   * an instance does not belong to another uuid that we know about.  For
   * instances that we don't have addrs yet, we also create one.
   *
   * Returns a mapping from uuid to ObjInst for internal instances.
   */
  private _gatherInternalInstsAndAssignAddrs(
    root: classesModule.ObjInst,
    uuid: string
  ): Record<number, classesModule.ObjInst> {
    const map = {};
    const visitInst = (inst: classesModule.ObjInst) => {
      if (inst.uid in map) {
        return;
      }
      let addr = this._uid2addr[inst.uid];
      if (addr && addr.uuid !== uuid) {
        // This instance belongs to another uuid
        return;
      }

      if (!addr) {
        // No address for this instance yet; create one!
        addr = this._uid2addr[inst.uid] = { uuid, iid: this.getNewIid() };
        this._addr2inst[addrKey(addr)] = inst;
      }
      map[inst.uid] = inst;
      this._fieldVals(inst, visitInst);
    };
    visitInst(root);
    return map;
  }

  // Produce a bundle using a bundle map.
  //
  // UID/Insts referencing Insts -> Addr/Json referencing Addrs
  //
  // Need uid2addr.
  bundle(root: classesModule.ObjInst, uuid: string, version: string): Bundle {
    this._uuid2root[uuid] = root;

    // Build a map from uid to all instances under `root`.  This map will only
    // include instances that belong to this `uuid`.
    const uid2inst = this._gatherInternalInstsAndAssignAddrs(root, uuid);

    // At this point, all "internal instances" (instances belonging to this `uuid`)
    // will have an entry in `uid2inst`.
    check(!isEmpty(uid2inst));
    check(root.uid in uid2inst);

    const seenDeps = new Set<string>();
    /**
     * Creates a reference to the argument `inst` by its id
     */
    const mkRef = (inst: classesModule.ObjInst) => {
      const addr = check(this._uid2addr[inst.uid]);
      if (addr.uuid === uuid) {
        // If this is an internal instance, we reference it by the internal id
        return { __ref: addr.iid };
      } else {
        // If this is an external instance, we reference it by the full Addr
        // (including both the external `uuid` and the iid in that namespace)
        seenDeps.add(addr.uuid);
        return { __xref: addr };
      }
    };

    const getIid = (inst: classesModule.ObjInst) =>
      check(this._uid2addr[inst.uid]).iid;
    const iid2json = Object.fromEntries(
      Object.keys(uid2inst || {}).map((uid) => {
        const inst = uid2inst[uid];
        const iid = getIid(inst);
        // To turn this instance into its json representation, we turn
        // all its field values that are instances into references (via mkRef)
        // and leave field values that are primitives intact.  That means
        // the json should not contain another instance; only primitives and
        // references to other instances.
        const json = Object.fromEntries(
          filterFalsy(
            this._fieldVals(inst, mkRef).map(([field, val]) => {
              if (field.annotations.includes("Transient")) {
                return undefined;
              }
              return tuple(field.name, isNil(val) ? null : val);
            })
          )
        );

        return tuple(iid, {
          ...json,
          __type: this._instUtil.getInstClass(inst).name,
        });
      })
    );
    return {
      root: getIid(root),
      map: iid2json,
      deps: Array.from(seenDeps),
      version,
    };
  }

  // Deserialize a bundle into an object graph and return the mapping of IID to
  // object.
  //
  // If we've previously bundled or unbundled objects with these Addrs, then
  // reuse (update) the instances they map to.
  //
  // Precondition: any externally referenced objects must have previously been
  // bundled or unbundled.
  //
  // Addr/Jsons referencing Addrs -> merge into UID/Insts referencing Insts
  //
  // Need addr2inst.
  unbundleToMap(
    bundle: UnsafeBundle,
    uuid: string,
    incremental: boolean
  ): { [iid: string]: classesModule.ObjInst } {
    const localAddr2inst: Record<string, classesModule.ObjInst> = mkMap();
    const addr2inst = (addr: string) =>
      localAddr2inst[addr] != null
        ? localAddr2inst[addr]
        : this._addr2inst[addr];
    const localUid2addr = mkMap();
    const missingXrefError = (xref) => {
      if (this.looseMode) {
        return xref;
      }
      throw new Error(
        `Missing xref (${xref.uuid}, ${
          xref.iid
        }) (only know about: ${this.allUuids().join(", ")})`
      );
    };

    // For incremental unbundling, the tree might already be observed by mobx
    // so we want to delay fixing fields from those instances until the new
    // instances are correct (in order to avoid mobx from seeing those fixes
    // as model changes).
    // See https://app.clubhouse.io/plasmic/story/17655/crash-when-syncing-changes-from-other-users
    const delayedIids = new Set(
      incremental
        ? Object.keys(bundle.map || {}).filter(
            (iid) => !!this._addr2inst[addrKey({ uuid, iid: iid })]
          )
        : []
    );

    // First we build a map from iid to instances from the bundle.  All instances here
    // should be internal instances; we instantiate the classes, but are not doing anything
    // to fix up instance references in field values yet.
    const iid2internalInst: Record<string, classesModule.ObjInst> =
      Object.fromEntries(
        Object.keys(bundle.map || {}).map((iid) => {
          const json = bundle.map[iid];
          const realClass = this._realClasses[json.__type];
          if (!realClass) {
            throw new Error(`Unknown type ${json.__type}`);
          }
          const addr = { uuid, iid };
          let inst = addr2inst(addrKey(addr));
          if (inst == null) {
            inst = localAddr2inst[addrKey(addr)] = this.looseMode
              ? Object.assign(
                  Object.create(realClass.prototype),
                  { uid: Math.random() },
                  json
                )
              : new realClass(json);
          } else {
            assert(
              inst instanceof realClass,
              `Cached instance has unexpected type ${this._instUtil.getInstClassName(
                inst
              )}, expected ${json.__type}`
            );
          }
          localUid2addr[inst.uid] = addr;
          return tuple(iid, inst);
        })
      );

    // Now we deal with fixing up the field values, basically replacing
    // {__ref} and {__xref} with actual instances.  At this point, all internal references
    // should already be stored in `localAddr2inst`, and all external references should hopefully
    // be in this._addr2inst, because we assume we've already unbundled our dependencies.
    const readValueOrRef = (
      x:
        | number
        | boolean
        | null
        | string
        | { __ref: string }
        | { __xref: Addr }
        | {}[]
        | {}
    ) => {
      if (
        typeof x === "number" ||
        typeof x === "boolean" ||
        x === null ||
        typeof x === "string" ||
        !isObject(x)
      ) {
        return x;
      }
      if ("__ref" in x) {
        // If we are unbundling an incomplete bundle, we must have the
        // missing instances already in the bundler cache, so we can call
        // `addr2inst` to get them; otherwise, all instances should exist in
        // `iid2internalInst`.
        const inst = incremental
          ? iid2internalInst[x.__ref] ??
            addr2inst(addrKey({ uuid, iid: x.__ref }))
          : iid2internalInst[x.__ref];
        return ensure(inst, `Missing reference (IID ${x.__ref})`);
      } else if ("__xref" in x) {
        return coalesce(addr2inst(addrKey(x.__xref)), () =>
          missingXrefError(x.__xref)
        );
      } else {
        return x;
      }
    };
    for (const iid of [
      ...Object.keys(bundle.map).filter((i) => !delayedIids.has(i)),
      ...Array.from(delayedIids.keys()),
    ]) {
      const json: any = bundle.map[iid];
      const inst = iid2internalInst[iid];
      const cls = this._rt.clsByName[json.__type];
      for (const field of this._rt.allFields(cls)) {
        if (field.annotations.includes("Transient")) {
          continue;
        }
        if (incremental && !(field.name in json)) {
          continue;
        }
        const valueOrRef = json[field.name];
        let value: any;
        if (
          field.type.type === "Optional" &&
          (valueOrRef === null || valueOrRef === undefined)
        ) {
          value = valueOrRef;
        } else {
          value =
            // List/Set type
            isArray(valueOrRef)
              ? [...valueOrRef].map((x) => readValueOrRef(x))
              : // Map type
              isLiteralObject(valueOrRef) && !isAnyRef(valueOrRef)
              ? Object.fromEntries(
                  Object.keys(valueOrRef || {}).map((k) => {
                    const v = valueOrRef[k];

                    return tuple(k, readValueOrRef(v));
                  })
                )
              : readValueOrRef(valueOrRef);
        }
        // If we are loading incremental changes, we might avoid unnecessary
        // assignments as they could be seen as model changes
        if (!incremental || this._rt.readField(inst, field.name) !== value) {
          if (
            incremental &&
            Array.isArray(value) &&
            Array.isArray(inst[field.name])
          ) {
            // Updating the contents of an array field - keep the same object
            // so we can reconcile.
            inst[field.name].splice(0, inst[field.name].length, ...value);
          } else {
            this._rt.writeField(inst, field.name, value);
          }
        }
      }
    }
    Object.assign(this._addr2inst, localAddr2inst);
    Object.assign(this._uid2addr, localUid2addr);
    this._uuid2root[uuid] = iid2internalInst[bundle.root];
    return iid2internalInst;
  }

  // Deserialize a bundle into an object graph and return the root object.
  unbundle(bundle: UnsafeBundle, uuid: string, incremental = false) {
    const iid2internalInst = this.unbundleToMap(bundle, uuid, incremental);
    return iid2internalInst[bundle.root];
  }
}

const iidFieldKey = (iid: string, field: Field) => `${iid} ${field.name}`;
const iidFieldKey2Iid = (key: string) => key.split(" ")[0];
const iidFieldKey2Field = (key: string) => key.split(" ")[1];

/**
 * Dynamically tracks the reachable iids and incrementally updates one
 * particular bundle according to changes in its `ObjInst`s.
 */
export class FastBundler extends Bundler {
  private _uuid: string | undefined;
  private _bundle: Bundle | undefined;

  // iid to set of `iidFieldKey`s that (strongly) reference it
  private _iid2Parents = new Map<string, Set<string>>();

  // iid to set of `iidFieldKey`s that weakly reference it
  private _iid2WeakRefs = new Map<string, Set<string>>();

  // xref's addrKey to set of `iidFieldKey`s that (strongly) reference it
  private _xref2Parents = new Map<string, Set<string>>();

  // xref's addrKey to set of `iidFieldKey`s that weakly reference it
  private _xref2WeakRefs = new Map<string, Set<string>>();

  constructor(rt = meta, classes = classesModule) {
    super(rt, classes);
  }

  cachedBundle() {
    return this._bundle;
  }

  fastBundle(
    root: classesModule.ObjInst,
    uuid: string,
    changedInsts: {
      readonly inst: classesModule.ObjInst;
      readonly field: string;
    }[]
  ): DeepReadonly<Bundle> {
    assert(
      uuid === this._uuid,
      () => `uuids didn't match: ${uuid} and ${this._uuid}`
    );
    assert(this._bundle, () => `_bundle is not set`);
    const bundle = this._bundle;

    const getIid = (inst: classesModule.ObjInst): string | undefined =>
      this._uid2addr[inst.uid]?.iid;

    // We only want to process the changed fields of the reachable iids;
    // each element in the queue is the inst to be included in the bundle
    // and the field to be visited (or null if all fields should be).
    const queueOfChangedNodes: [classesModule.ObjInst, string | null][] = [];

    // Stores the nodes already recorded and their fields
    const seenNodesToField = new Map<classesModule.ObjInst, string | null>();

    changedInsts.forEach(({ inst, field }) => {
      const iid = getIid(inst);
      if (iid && iid in bundle.map) {
        queueOfChangedNodes.push([inst, field]);
      }
    });

    /**
     * Creates a reference to the argument `child` by its id,
     * and adds the child to the queue if it wasn't reachable
     */
    const mkRefAndMaybeVisit = (
      child: classesModule.ObjInst,
      parentIid: string,
      field: Field
    ) => {
      let addr = this._uid2addr[child.uid];
      if (!addr) {
        // No address for this instance yet; create one!
        addr = this._uid2addr[child.uid] = { uuid, iid: this.getNewIid() };
        this._addr2inst[addrKey(addr)] = child;
      }
      const ref = (() => {
        if (addr.uuid === uuid) {
          if (isStrongRefField(field) && !(addr.iid in bundle.map)) {
            // This node was not present in the last bundling, so we should add it!
            // Otherwise, it was an observable and all changes to it should be
            // recorded, so there's no need to enqueue.
            queueOfChangedNodes.push([child, null]);
          }
          // If this is an internal instance, we reference it by the internal id
          return { __ref: addr.iid };
        } else {
          // If this is an external instance, we reference it by the full Addr
          // (including both the external `uuid` and the iid in that namespace)
          return { __xref: addr };
        }
      })();
      this.addRefs(parentIid, ref, field);
      return ref;
    };

    const toDeleteNodes: string[] = [];

    if (bundle.root !== getIid(root)) {
      // If we promoted a pkg Version to latest, the root will change from the
      // ProjectDependency to its Site, so we want to delete the old root.
      toDeleteNodes.push(bundle.root);
      bundle.root = ensure(
        getIid(root),
        () => `Couldn't find iid for root instance`
      );
    }

    while (queueOfChangedNodes.length > 0) {
      const [inst, field] = ensure(
        queueOfChangedNodes.shift(),
        () => `queueOfChangedNodes shouldn't be empty`
      );
      if (
        seenNodesToField.has(inst) &&
        (seenNodesToField.get(inst) === null ||
          seenNodesToField.get(inst) === field)
      ) {
        continue;
      }
      seenNodesToField.set(inst, field);
      const iid = ensure(getIid(inst), () => `Couldn't find iid for instance`);

      // Remove old references from each inst
      const oldJson = bundle.map[iid];

      // If only one field has changed in an existing instance, we can restrict
      // the fields to visit.
      const listOfFields = !!field && iid in bundle.map ? [field] : undefined;
      if (oldJson) {
        visitRefsInFields(
          oldJson,
          (fieldRef, f) => this.removeRefs(iid, fieldRef, toDeleteNodes, f),
          listOfFields,
          this._rt
        );
      }
      const json = Object.fromEntries(
        this._fieldVals(
          inst,
          (child, f) => mkRefAndMaybeVisit(child, iid, f),
          listOfFields,
          {
            // We don't type check the fields right now, because unreachable
            // instances might have uninitialized values. We make sure to type
            // check the fields for reachable instances below.
            noTypeCheck: true,
          }
        ).map(([f, val]) => {
          return tuple(f.name, isNil(val) ? null : val);
        })
      );

      bundle.map[iid] = {
        ...(listOfFields
          ? bundle.map[iid]
          : {
              __type: this._instUtil.getInstClass(inst).name,
            }),
        ...json,
      };
    }

    // Remove all unreachable iids from bundle (filter insts that are still
    // unreachable)
    this.prune(toDeleteNodes.filter((iid) => !this._iid2Parents.has(iid)));

    // Type check bundle fields for reachable nodes
    Array.from(seenNodesToField.keys())
      .filter((inst) =>
        maybe(getIid(inst), (iid) => (iid in bundle.map ? true : false))
      )
      .forEach((inst) =>
        this._fieldVals(inst, () => null, undefined, { noTypeCheck: false })
      );

    bundle.deps = uniq(
      [...this._xref2Parents.entries(), ...this._xref2WeakRefs.entries()]
        .filter(([_, refs]) => refs.size > 0)
        .map(([key, _]) => key2Addr(key).uuid)
    );

    if (!DEVFLAGS.skipInvariants) {
      this.assertFastBundleInvariants();
    }
    return bundle;
  }

  private prune(toDeleteNodes: string[]) {
    const bundle = ensure(this._bundle, () => `_bundle is not set`);
    while (toDeleteNodes.length > 0) {
      const iid = ensure(
        toDeleteNodes.shift(),
        () => `toDeleteNodes shouldn't be empty`
      );
      assert(
        !this._iid2Parents.has(iid),
        () => `Instance still has list of parents: ${iid}`
      );
      if (bundle.root !== iid) {
        visitRefsInFields(
          bundle.map[iid],
          (fieldInst, field) =>
            this.removeRefs(iid, fieldInst, toDeleteNodes, field),
          undefined,
          this._rt
        );
        delete bundle.map[iid];
      }
    }
  }

  private removeRefs(
    parentIid: string,
    refVal: Ref,
    toDeleteNodes: string[],
    field: Field
  ) {
    const parentKey = iidFieldKey(parentIid, field);
    const rmParentFromSet = (
      childKey: string,
      container: Map<string, Set<string>>
    ) => {
      const parents = ensure(
        container.get(childKey),
        () => `Couldn't get parent list for key ${childKey}`
      );
      assert(
        parents.has(parentKey),
        () =>
          `Parent list for child ${childKey} doesn't include parent ${parentKey}`
      );
      parents.delete(parentKey);
      if (parents.size === 0) {
        container.delete(childKey);
        if (container === this._iid2Parents) {
          toDeleteNodes.push(childKey);
        }
      }
    };
    this._updateParentsForRef(refVal, field, rmParentFromSet);
  }

  private addRefs(parentIid: string, refVal: Ref, field: Field) {
    const parentKey = iidFieldKey(parentIid, field);
    const addParentToSet = (
      childKey: string,
      container: Map<string, Set<string>>
    ) => {
      if (container === this._iid2Parents) {
        assert(
          childKey !== this._bundle?.root,
          "Added strong reference to root instance"
        );
      }
      const parents = xSetDefault(container, childKey, () => new Set<string>());
      assert(
        !parents.has(parentKey),
        () => `parentKey already used: ${parentKey}`
      );
      parents.add(parentKey);
    };
    this._updateParentsForRef(refVal, field, addParentToSet);
  }

  private _updateParentsForRef(
    refVal: Ref,
    field: Field,
    updateFunc: (key: string, container: Map<string, Set<string>>) => void
  ) {
    if ("__ref" in refVal) {
      const iid = refVal.__ref;
      if (isStrongRefField(field)) {
        updateFunc(iid, this._iid2Parents);
      } else {
        assert(
          isWeakRefField(field),
          () => `Expected weakRef, but got: ${JSON.stringify(field)}`
        );
        updateFunc(iid, this._iid2WeakRefs);
      }
    } else {
      assert(
        "__xref" in refVal,
        () => `Expected xref, but got: ${JSON.stringify(refVal)}`
      );
      const addr = addrKey(refVal.__xref);
      if (isStrongRefField(field)) {
        updateFunc(addr, this._xref2Parents);
      } else {
        assert(
          isWeakRefField(field),
          () => `Expected weakRef, but got: ${JSON.stringify(field)}`
        );
        updateFunc(addr, this._xref2WeakRefs);
      }
    }
  }

  unbundleAndRecomputeParents(bundle: Bundle, uuid: string) {
    const res = this.unbundle(bundle, uuid);
    this.recomputeParents(bundle, uuid);
    return res;
  }

  private recomputeParents(bundle: Bundle, uuid: string) {
    removeUnreachableNodesFromBundle(bundle);
    this._uuid = uuid;
    this._bundle = bundle;
    this._iid2Parents.clear();
    this._iid2WeakRefs.clear();
    this._xref2Parents.clear();
    this._xref2WeakRefs.clear();

    Object.entries(bundle.map).forEach(([iid, json]) =>
      visitRefsInFields(
        json,
        (fieldInst, field) => this.addRefs(iid, fieldInst, field),
        undefined,
        this._rt
      )
    );

    this.assertFastBundleInvariants();
  }

  private assertFastBundleInvariants() {
    const bundle = ensure(this._bundle, () => `_bundle is not set`);

    const iid2ClassName = (iid: string) => {
      const inst = this.objByAddr({
        uuid: ensure(this._uuid, () => `uuid is not set`),
        iid,
      });
      const cls = this._instUtil.tryGetInstClass(inst);
      return cls?.name;
    };

    const getParents = (parents: Set<string>) =>
      [...parents.keys()]
        .map((addrFieldKey) => {
          const parentIid = iidFieldKey2Iid(addrFieldKey);
          const parentField = iidFieldKey2Field(addrFieldKey);
          return `(${iid2ClassName(
            parentIid
          )}.${parentField} IID:${parentIid})`;
        })
        .join(", ");

    // Assertions for the bundle internal nodes:
    const errors = withoutNils(
      Object.keys(bundle.map).map((iid) => {
        if (iid !== bundle.root) {
          // Assert that every node in the bundle is reachable
          if (!this._iid2Parents.has(iid)) {
            return `Unreachable instance of type ${bundle.map[iid].__type} found (IID ${iid})`;
          }
          const parents = ensure(
            this._iid2Parents.get(iid),
            () => `Couldn't get strong references to ${iid}`
          );

          // Assert that every node has exactly one strong parent (i.e. the
          // model is a tree)
          if (parents.size !== 1) {
            return (
              `Instance (IID ${iid}) of type ${bundle.map[iid].__type} has` +
              ` multiple parents:\n` +
              getParents(parents)
            );
          }

          // Assert that the parent is in the tree
          const parentIid = iidFieldKey2Iid([...parents.keys()][0]);
          if (!(`${parentIid}` in bundle.map)) {
            return (
              `Instance (IID ${iid}) of type ${bundle.map[iid].__type} is in` +
              ` the bundle but its parent isn't. Parent info:` +
              getParents(parents)
            );
          }
        } else {
          // Assert that no one strongly references the root
          if (this._iid2Parents.has(iid)) {
            return (
              `Root (IID ${iid}, ${bundle.map[iid].__type}) has parents:\n` +
              getParents(
                ensure(
                  this._iid2Parents.get(iid),
                  () => `Couldn't get strong references to ${iid}`
                )
              )
            );
          }
        }
        return null;
      })
    );

    // Assert that every reachable internal node is in the bundle
    const reachableNodesNotInTheBundle = uniq([
      ...this._iid2Parents.keys(),
      ...this._iid2WeakRefs.keys(),
    ]).filter((iid) => !(iid in bundle.map));
    if (reachableNodesNotInTheBundle.length !== 0) {
      errors.push(
        `Found reachable instances not in the bundle:\n` +
          reachableNodesNotInTheBundle
            .map((iid) => {
              return `IID: ${iid}, type: ${iid2ClassName(iid)}, parents: ${
                this._iid2Parents.has(iid)
                  ? getParents(
                      ensure(
                        this._iid2Parents.get(iid),
                        () => `Couldn't get strong refs to ${iid}`
                      )
                    )
                  : `(WeakRefs)` +
                    getParents(
                      ensure(
                        this._iid2WeakRefs.get(iid),
                        () => `Couldn't get weak refs to ${iid}`
                      )
                    )
              }`;
            })
            .join("\n")
      );
    }

    // Assertions for external nodes:
    uniq([...this._xref2Parents.keys(), ...this._xref2WeakRefs.keys()]).forEach(
      (key) => {
        // For external references, we don't copy them to the importing site
        // except for when we are actually using them (e.g. when instantiating
        // a component or applying a mixin). For this reason, those xrefs have
        // only weakRefs pointing to them.
        if (this._xref2Parents.has(key)) {
          const inst = this._addr2inst[key];
          const cls = maybe(inst, () => this._instUtil.tryGetInstClass(inst));
          errors.push(
            `xref ${key} of type ${cls?.name} has` +
              `unexpected parents:\n` +
              getParents(
                ensure(
                  this._xref2Parents.get(key),
                  () => `Already checked by the if condition above`
                )
              )
          );
        }

        // Make sure that all references are from reachable nodes
        const parents = uniq([
          ...(this._xref2Parents.get(key)?.keys() || []),
          ...(this._xref2WeakRefs.get(key)?.keys() || []),
        ]);
        if (
          !parents.every(
            (parentKey) => iidFieldKey2Iid(parentKey) in bundle.map
          )
        ) {
          errors.push(`Parent map of xref is out of date`);
        }
      }
    );

    if (errors.length > 0) {
      console.log(errors.join("\n"));
    }

    assert(
      errors.length === 0,
      `Bundle invariant failed\n${errors.join("\n")}`
    );
  }
}
