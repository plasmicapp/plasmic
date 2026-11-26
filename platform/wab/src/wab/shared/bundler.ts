import { DeepReadonly } from "@/wab/commons/types";
import { Bundle, BundledInst, UnsafeBundle } from "@/wab/shared/bundles";
import {
  assert,
  check,
  ensure,
  ensureInstance,
  isLiteralObject,
  maybe,
  mkShortId,
  xSetDefault,
} from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { InstUtil } from "@/wab/shared/model/InstUtil";
import * as classesModule from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import {
  Class,
  Field,
  MetaRuntime,
  Type,
  checkEqKeys,
  isModelInst,
  isStrongRefField,
  isWeakRefField,
  toTs,
} from "@/wab/shared/model/model-meta";
import { conformsToType } from "@/wab/shared/model/model-util";
import { uniq } from "lodash";

export type { Bundle, BundledInst };

// Key requirements:
//
// Addrs are stable.  Hence must remember UID-to-Addr mappings (but don't need
// bundles) and also the max-IID for this bundle to continue generating them.
//
// Instances are stable.  Hence must remember intsances and merge-update the
// instance graph.

const isXref = (x: any) => isLiteralObject(x) && "__xref" in x;

interface Addr {
  iid: string;
  uuid: string;
}

export const addrKey = (xref: Addr) => `${xref.uuid} ${xref.iid}`;
const key2Addr = (key: string): Addr => {
  const vals = key.split(" ");
  return { uuid: vals[0], iid: vals[1] };
};

type Ref = { __ref: string } | { __xref: Addr };

// Pass the field through recursion to reuse one visitor across instances.
function visitFieldRefs<A>(
  valueOrRef: any,
  visitRef: (ref: Ref, arg: A) => void,
  arg: A,
) {
  if (Array.isArray(valueOrRef)) {
    for (let i = 0; i < valueOrRef.length; i++) {
      visitFieldRefs(valueOrRef[i], visitRef, arg);
    }
  } else if (isLiteralObject(valueOrRef)) {
    if ("__ref" in valueOrRef || "__xref" in valueOrRef) {
      visitRef(valueOrRef as Ref, arg);
    } else {
      for (const v of Object.values(valueOrRef)) {
        visitFieldRefs(v, visitRef, arg);
      }
    }
  }
}

/** Visits references in the selected fields of a bundled instance. */
export function visitRefsInFields(
  bundledInst: any,
  visitRef: (fieldRef: Ref, field: Field) => void,
  fields?: string[],
  rt = meta,
) {
  const cls = ensure(
    meta.clsByName[bundledInst.__type],
    () => `Couldn't get class for type ${bundledInst.__type}`,
  );
  for (const field of rt.allFields(cls)) {
    if (!fields || fields.includes(field.name)) {
      visitFieldRefs(bundledInst[field.name], visitRef, field);
    }
  }
}

export function checkExistingReferences(bundle: Bundle) {
  const map = bundle.map || {};
  const checkValueOrRef = (x: Ref) => {
    if ("__ref" in x) {
      assert(map[x.__ref], () => `Missing reference (IID ${x.__ref})`);
    } else {
      assert(
        bundle.deps.includes(x.__xref.uuid),
        () =>
          `Missing xref (${x.__xref.uuid}, ${
            x.__xref.iid
          }) (only know about: ${bundle.deps.sort().join(", ")})`,
      );
    }
  };

  for (const iid of Object.keys(map)) {
    visitFieldRefs(map[iid], checkValueOrRef, undefined);
  }
}

export function getAllXRefs(bundle: Bundle) {
  const map = bundle.map || {};
  const xrefs: { __xref: Addr }[] = [];

  const checkRef = (x: Ref) => {
    if ("__xref" in x) {
      xrefs.push(x);
    }
  };

  for (const iid of Object.keys(map)) {
    visitFieldRefs(map[iid], checkRef, undefined);
  }

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
    visitFieldRefs(bundle.map[iid], visitRef, undefined);
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
  },
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

  const emptyParents = (): never[] => [];
  const getParents = <K, T>(parents: Map<K, T[]>, key: K) =>
    xSetDefault(parents, key, emptyParents);

  const queue = [bundle.root];
  const reachableIids = new Set([bundle.root]);

  let parent: string;
  const visitRef = (ref: Ref, field: Field) => {
    if ("__ref" in ref) {
      const iid = ref.__ref;
      if (!reachableIids.has(iid)) {
        reachableIids.add(iid);
        queue.push(iid);
      }
      getParents(
        isWeakRefField(field) ? weakRefParents : strongRefParents,
        iid,
      ).push({ iid: parent, field: field.name });
    } else if (isStrongRefField(field)) {
      getParents(xref2strongRefParents, addrKey(ref.__xref)).push({
        iid: parent,
        field: field.name,
      });
    }
  };

  while (queue.length > 0) {
    parent = queue.pop()!;
    visitRefsInFields(bundle.map[parent], visitRef);
  }
  const displayInst = (iid: string) => `${bundle.map[iid]?.__type}[${iid}]`;
  Object.keys(bundle.map).forEach((iid) => {
    if (
      getParents(weakRefParents, iid).length > 0 &&
      getParents(strongRefParents, iid).length === 0
    ) {
      console.log(
        `Invalid weak ref to unreachable instance ${displayInst(
          iid,
        )}: ${getParents(weakRefParents, iid)
          .map(
            ({ iid: parentIid, field }) => `${displayInst(parentIid)}.${field}`,
          )
          .join(", ")}`,
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

  // Report the first collection error, but still validate every item.
  function checkType(value: any, tp: Type): string | undefined {
    switch (tp.type) {
      case "String":
        return typeof value === "string"
          ? undefined
          : `${value} is not a string`;
      case "StringLiteral":
        return value === tp.params[0]
          ? undefined
          : `${value} is not a string literal ${JSON.stringify(tp.params[0])}`;
      case "Number":
        return typeof value === "number"
          ? undefined
          : `${value} is not a number`;
      case "Bool":
        return typeof value === "boolean"
          ? undefined
          : `${value} is not a boolean`;
      case "List":
      case "Set": {
        if (!Array.isArray(value)) {
          return `${value} is not an array`;
        }
        if (value.length === 0) {
          return undefined;
        }
        const itemType = ensureInstance(tp.params[0], Type);
        let error: string | undefined;
        for (let i = 0; i < value.length; i++) {
          const itemError = checkType(value[i], itemType);
          error ??= itemError;
        }
        return error;
      }
      case "Lit":
        return typeof value === "number" ||
          typeof value === "string" ||
          value === null ||
          value === undefined
          ? undefined
          : `Lit must be number, string, null or undefined`;
      case "Optional":
        if (value !== null && value !== undefined) {
          return checkType(value, ensureInstance(tp.params[0], Type));
        } else {
          return undefined;
        }
      case "Map": {
        if (!isLiteralObject(value)) {
          return `${value} is not a plain object`;
        }
        const keys = Object.keys(value);
        if (keys.length === 0) {
          return undefined;
        }
        const keyType = ensureInstance(tp.params[0], Type);
        const valueType = ensureInstance(tp.params[1], Type);
        let error: string | undefined;
        for (const key of keys) {
          const keyError = checkType(key, keyType);
          const valueError = checkType(value[key], valueType);
          error ??= keyError ?? valueError;
        }
        return error;
      }
      case "Or": {
        // A later alternative can throw even after an earlier match.
        let matched = false;
        for (const p of tp.params) {
          if (checkType(value, ensureInstance(p, Type)) === undefined) {
            matched = true;
          }
        }
        if (matched) {
          return undefined;
        }
        return `${JSON.stringify(value)} ${
          typeof value === "object" &&
          value &&
          "__ref" in value &&
          map[value.__ref]
            ? `(${map[value.__ref].__type}) `
            : ""
        }does not match any of the types ${tp.params.map((p) =>
          toTs(ensureInstance(p, Type)),
        )}`;
      }
      case "Any":
        return undefined;
      default: {
        if (isXref(value)) {
          // TODO: We do not validate xrefs at the moment.
          return undefined;
        }

        const refType = map[value.__ref]?.__type;

        const refCls = meta.clsByName[refType];
        if (!refCls) {
          return `${JSON.stringify(map[value.__ref])} (referenced by (${
            tp.type
          }): ${JSON.stringify(value)}) has unknown type "${refType}"`;
        }
        const tpCls = ensure(
          meta.clsByName[tp.type],
          () => `Couldn't find class by name ${tp.type}`,
        );
        return meta.isSubclass(refCls, tpCls)
          ? undefined
          : `Wrong type (got ${refType}, want ${tp.type})`;
      }
    }
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
      `Unknown type: ${obj.__type}`,
    );

    checkEqKeys(
      obj,
      meta.allFieldKeys(cls),
      meta.allTransientFieldKeys(cls),
      obj.__type,
    );

    const fields = meta.allFields(cls);
    for (const field of fields) {
      const error = checkType(obj[field.name], field.type);
      if (error !== undefined) {
        errors.push({
          iid,
          field: field.name,
          error: new Error(error),
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
              `- iid: ${e.iid}, field: ${e.field}, error: ${e.error.message}`,
          )
          .join("\n"),
    );
  }
}

interface GatheredInst {
  iid: string;
  json: BundledInst;
  deps?: string[];
}

// Preserve own __proto__ keys when copying maps and instance IDs.
function setOwnProperty(obj: object, key: string, value: unknown) {
  if (key === "__proto__") {
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  } else {
    obj[key] = value;
  }
}

function bundleFieldVal(
  val: any,
  field: Field,
  visitInst: (inst: classesModule.ObjInst, field: Field) => any,
) {
  if (val == null) {
    return null;
  } else if (Array.isArray(val)) {
    // Holes become undefined
    const copy = new Array(val.length);
    for (let i = 0; i < val.length; i++) {
      const x = val[i];
      copy[i] = isModelInst(x)
        ? visitInst(x as classesModule.ObjInst, field)
        : x;
    }
    return copy;
  } else if (isLiteralObject(val)) {
    const copy = {};
    const keys = Object.keys(val);
    for (let i = 0; i < keys.length; i++) {
      const x = val[keys[i]];
      setOwnProperty(
        copy,
        keys[i],
        isModelInst(x) ? visitInst(x as classesModule.ObjInst, field) : x,
      );
    }
    return copy;
  } else {
    return isModelInst(val)
      ? visitInst(val as classesModule.ObjInst, field)
      : val;
  }
}

// TODO fix mem leak, should track entire bundles so that they can be wiped
export class Bundler {
  protected _rt: MetaRuntime;
  protected _instUtil: InstUtil;
  protected _realClasses;
  // Public for tests
  _addr2inst: Map<string, classesModule.ObjInst>;
  // Public for tests
  _uid2addr: Map<number, Addr>;
  private _uuid2root: Map<string, classesModule.ObjInst>;

  constructor(rt = meta, classes = classesModule) {
    this._rt = rt;
    this._instUtil = new InstUtil(rt, classes.justClasses);
    this._realClasses = classes;
    // maps from Addr to latest deserialized instance graph; unbundle() uses
    // this
    this._addr2inst = new Map();
    // maps from UID to Addr; bundle() uses this
    this._uid2addr = new Map();
    // maps from UUID to root
    this._uuid2root = new Map();
  }

  getNewIid = () => mkShortId();

  private _ctorToBundledClass = new Map<
    Function,
    { cls: Class; fields: readonly Field[] }
  >();

  private _bundledClass(inst: classesModule.ObjInst) {
    let entry = this._ctorToBundledClass.get(inst.constructor);
    if (!entry) {
      const cls = this._instUtil.getInstClass(inst);
      entry = {
        cls,
        fields: this._rt
          .allFields(cls)
          .filter((f) => !f.annotations.includes("Transient")),
      };
      this._ctorToBundledClass.set(inst.constructor, entry);
    }
    return entry;
  }

  private _assertFieldType(cls: Class, f: Field, val: any) {
    if (!conformsToType(val, f.type, this._instUtil)) {
      assert(
        false,
        `Expected type ${toTs(f.type)} for field ${cls.name}.${
          f.name
        } value ${val} ${
          this._instUtil.isObjInst(val)
            ? `(${this._instUtil.getInstClassName(val)})`
            : ""
        }`.trim(),
      );
    }
  }

  protected _typeCheckFields(inst: classesModule.ObjInst) {
    const { cls, fields } = this._bundledClass(inst);
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      this._assertFieldType(cls, f, inst[f.name]);
    }
  }

  /** Writes fields in schema order, replacing model instances with references. */
  protected _bundleFields(
    inst: classesModule.ObjInst,
    visitInst: (inst: classesModule.ObjInst, field: Field) => any,
    json: Record<string, any>,
    fields?: readonly string[],
    opts?: { noTypeCheck?: boolean },
  ) {
    const { cls, fields: bundledFields } = this._bundledClass(inst);
    const typeCheck = !opts?.noTypeCheck;
    for (let i = 0; i < bundledFields.length; i++) {
      const f = bundledFields[i];
      if (fields && !fields.includes(f.name)) {
        continue;
      }
      const val = inst[f.name];
      if (typeCheck) {
        this._assertFieldType(cls, f, val);
      }
      json[f.name] = bundleFieldVal(val, f, visitInst);
    }
  }

  addrOf(obj: classesModule.ObjInst): Addr | undefined {
    return this._uid2addr.get(obj.uid);
  }

  /** @deprecated - use {@link addrOf} and handle missing case */
  addrOfUnsafe(obj: classesModule.ObjInst): Addr {
    return this._uid2addr.get(obj.uid) as Addr;
  }

  objByAddr(addr: Addr): classesModule.ObjInst | undefined {
    return this._addr2inst.get(addrKey(addr));
  }

  allIidsByUuid(uuid: string) {
    return [...this._uid2addr.values()]
      .filter((addr) => addr.uuid === uuid)
      .map((addr) => addr.iid);
  }

  allUuids() {
    return [...this._uuid2root.keys()].sort();
  }

  bundle(root: classesModule.ObjInst, uuid: string, version: string): Bundle {
    this._uuid2root.set(uuid, root);
    const gathered: Record<number, GatheredInst> = {};

    const visitInst = (
      inst: classesModule.ObjInst,
      parent?: GatheredInst,
    ): Ref => {
      const uid = inst.uid;
      const seen = gathered[uid];
      if (seen) {
        return { __ref: seen.iid };
      }
      let addr = this._uid2addr.get(uid);
      if (addr && addr.uuid !== uuid) {
        if (parent) {
          (parent.deps ??= []).push(addr.uuid);
        }
        return { __xref: addr };
      }
      if (!addr) {
        addr = { uuid, iid: this.getNewIid() };
        this._uid2addr.set(uid, addr);
        this._addr2inst.set(addrKey(addr), inst);
      }
      // Register before visiting children so cycles resolve to the same IID.
      const json = {} as BundledInst;
      const entry = { iid: addr.iid, json };
      gathered[uid] = entry;
      this._bundleFields(inst, (child) => visitInst(child, entry), json);
      json.__type = this._bundledClass(inst).cls.name;
      return { __ref: addr.iid };
    };

    visitInst(root);
    check(gathered[root.uid]);
    // Emit instances by ascending UID. List each dependency at its first reference in that order.
    const iid2json: Record<string, BundledInst> = {};
    const seenDeps = new Set<string>();
    for (const { iid, json, deps } of Object.values(gathered)) {
      setOwnProperty(iid2json, iid, json);
      if (deps) {
        for (const dep of deps) {
          seenDeps.add(dep);
        }
      }
    }
    return {
      root: gathered[root.uid].iid,
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
  private unbundleInternal(
    bundle: UnsafeBundle,
    uuid: string,
    partial: boolean,
  ): classesModule.ObjInst | undefined {
    const localAddr2inst = new Map<string, classesModule.ObjInst>();
    const addr2inst = (addr: string) =>
      localAddr2inst.get(addr) ?? this._addr2inst.get(addr);
    const localUid2addr = new Map<number, Addr>();
    const missingXrefError = (xref) => {
      throw new Error(
        `Missing xref (${xref.uuid}, ${
          xref.iid
        }) (only know about: ${this.allUuids().join(", ")})`,
      );
    };
    const keyPrefix = addrKey({ uuid, iid: "" });
    const map = bundle.map;
    const iids = Object.keys(map);

    // For incremental unbundling, existing instances may already be tracked,
    // and writing a new instance into one of their fields tracks it at once.
    // So fix the fields of existing instances only after the new instances
    // are complete, so that the tracker doesn't link placeholder refs or
    // record the fixes as model changes.
    // See https://app.clubhouse.io/plasmic/story/17655/crash-when-syncing-changes-from-other-users
    const delayedIids: string[] = [];
    const nonDelayedIids: string[] = partial ? [] : iids;

    const typeInfos = new Map<
      string,
      { realClass: any; isAbstract: boolean; fields?: Field[] }
    >();
    const getTypeInfo = (type: string) => {
      let info = typeInfos.get(type);
      if (!info) {
        const realClass = this._realClasses[type];
        info = {
          realClass,
          isAbstract:
            !!realClass && this._rt.isAbstract(this._rt.clsByName[type]),
        };
        typeInfos.set(type, info);
      }
      return info;
    };

    // Instantiate every object before resolving references between them.
    const iid2internalInst = new Map<string, classesModule.ObjInst>();
    for (const iid of iids) {
      const json = map[iid];
      const typeInfo = getTypeInfo(json.__type);
      const realClass = typeInfo.realClass;
      if (!realClass) {
        throw new Error(`Unknown type ${json.__type}`);
      }
      const key = keyPrefix + iid;
      let inst = this._addr2inst.get(key);
      if (!inst) {
        assert(
          !typeInfo.isAbstract,
          () => `Cannot instantiate abstract class ${json.__type}`,
        );
        inst = new realClass(json) as classesModule.ObjInst;
        localAddr2inst.set(key, inst);
        if (partial) {
          nonDelayedIids.push(iid);
        }
      } else {
        const cachedInst = inst;
        assert(
          inst instanceof realClass,
          () =>
            `Cached instance has unexpected type ${this._instUtil.getInstClassName(
              cachedInst,
            )}, expected ${json.__type}`,
        );
        if (partial) {
          delayedIids.push(iid);
        }
      }
      localUid2addr.set(inst.uid, { uuid, iid });
      iid2internalInst.set(iid, inst);
    }

    const readValueOrRef = (x: any) => {
      if (x === null || (typeof x !== "object" && typeof x !== "function")) {
        return x;
      }
      if ("__ref" in x) {
        // If we are unbundling an incomplete bundle, we must have the
        // missing instances already in the bundler cache, so we can call
        // `addr2inst` to get them; otherwise, all instances should exist in
        // `iid2internalInst`.
        const iid = x.__ref;
        const inst =
          iid2internalInst.get(iid) ??
          (partial ? addr2inst(keyPrefix + iid) : undefined);
        return ensure(inst, () => `Missing reference (IID ${iid})`);
      } else if ("__xref" in x) {
        const xref = x.__xref;
        return addr2inst(addrKey(xref)) ?? missingXrefError(xref);
      } else {
        return x;
      }
    };

    // Generated setters delegate to meta.writeField. Custom runtimes and
    // classes still need dynamic setter dispatch.
    const writeThroughMeta =
      this._rt === meta && this._realClasses === classesModule;
    const fixFields = (iid: string) => {
      const json: any = map[iid];
      const inst = ensure(
        iid2internalInst.get(iid),
        () => `iid2internalInst missing ${iid}`,
      );
      const typeInfo = getTypeInfo(json.__type);
      const fields = (typeInfo.fields ??= this._rt
        .allFields(this._rt.clsByName[json.__type])
        .filter((f) => !f.annotations.includes("Transient")));
      for (const field of fields) {
        const name = field.name;
        if (partial && !(name in json)) {
          continue;
        }
        const valueOrRef = json[name];
        // Each collection is a fresh copy, since the bundle may be kept and
        // changed later (e.g. by FastBundler)
        let value: any;
        if (Array.isArray(valueOrRef)) {
          // List/Set type. Holes become undefined.
          value = [];
          for (let i = 0; i < valueOrRef.length; i++) {
            value.push(readValueOrRef(valueOrRef[i]));
          }
        } else if (
          isLiteralObject(valueOrRef) &&
          !("__ref" in valueOrRef) &&
          !("__xref" in valueOrRef)
        ) {
          // Map type
          value = {};
          for (const key of Object.keys(valueOrRef)) {
            setOwnProperty(value, key, readValueOrRef(valueOrRef[key]));
          }
        } else {
          value = readValueOrRef(valueOrRef);
        }
        // If we are loading partial changes, we might avoid unnecessary
        // assignments as they could be seen as model changes
        // An assigned collection is recorded as its difference from the
        // current one
        if (!partial || inst[name] !== value) {
          if (writeThroughMeta) {
            meta.writeField(inst, field, value);
          } else {
            inst[name] = value;
          }
        }
      }
    };
    for (const iid of nonDelayedIids) {
      fixFields(iid);
    }
    for (const iid of delayedIids) {
      fixFields(iid);
    }
    // Merge local maps into the main maps
    localAddr2inst.forEach((value, key) => {
      this._addr2inst.set(key, value);
    });
    localUid2addr.forEach((value, key) => {
      this._uid2addr.set(key, value);
    });

    const rootInst = iid2internalInst.get(bundle.root);
    if (rootInst) {
      this._uuid2root.set(uuid, rootInst);
    }
    return rootInst;
  }

  /** Deserialize a bundle into an object graph and return the root object. */
  unbundle(bundle: UnsafeBundle, uuid: string): classesModule.ObjInst {
    return ensure(this.unbundleInternal(bundle, uuid, false), "missing root");
  }

  /** Deserialize a partial bundle into an object graph. */
  unbundlePartial(bundle: UnsafeBundle, uuid: string): void {
    this.unbundleInternal(bundle, uuid, true);
  }
}

const iidFieldKey = (iid: string, field: Field) => `${iid} ${field.name}`;
const iidFieldKey2Iid = (key: string) => {
  const space = key.indexOf(" ");
  return space < 0 ? key : key.slice(0, space);
};
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
    }[],
  ): DeepReadonly<Bundle> {
    assert(
      uuid === this._uuid,
      () => `uuids didn't match: ${uuid} and ${this._uuid}`,
    );
    assert(this._bundle, () => `_bundle is not set`);
    const bundle = this._bundle;

    const getIid = (inst: classesModule.ObjInst): string | undefined =>
      this._uid2addr.get(inst.uid)?.iid;

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
      field: Field,
    ) => {
      let addr = this._uid2addr.get(child.uid);
      if (!addr) {
        // No address for this instance yet; create one!
        addr = { uuid, iid: this.getNewIid() };
        this._uid2addr.set(child.uid, addr);
        this._addr2inst.set(addrKey(addr), child);
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
        () => `Couldn't find iid for root instance`,
      );
    }

    for (let next = 0; next < queueOfChangedNodes.length; next++) {
      const [inst, field] = queueOfChangedNodes[next];
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
          this._rt,
        );
      }
      // Updating one field keeps the old json's key order; otherwise __type
      // comes first.
      const json: BundledInst = listOfFields
        ? { ...bundle.map[iid] }
        : { __type: this._instUtil.getInstClass(inst).name };
      this._bundleFields(
        inst,
        (child, f) => mkRefAndMaybeVisit(child, iid, f),
        json,
        listOfFields,
        {
          // Unreachable instances may be uninitialized. Validate after pruning.
          noTypeCheck: true,
        },
      );
      bundle.map[iid] = json;
    }

    // Remove all unreachable iids from bundle (filter insts that are still
    // unreachable)
    this.prune(toDeleteNodes.filter((iid) => !this._iid2Parents.has(iid)));

    // Type check bundle fields for reachable nodes
    for (const inst of seenNodesToField.keys()) {
      const iid = getIid(inst);
      if (iid != null && iid in bundle.map) {
        this._typeCheckFields(inst);
      }
    }

    bundle.deps = uniq(
      Array.from(this._xref2Parents.entries())
        .concat(Array.from(this._xref2WeakRefs.entries()))
        .filter(([_, refs]) => refs.size > 0)
        .map(([key, _]) => key2Addr(key).uuid),
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
        () => `toDeleteNodes shouldn't be empty`,
      );
      assert(
        !this._iid2Parents.has(iid),
        () => `Instance still has list of parents: ${iid}`,
      );
      if (bundle.root !== iid) {
        visitRefsInFields(
          bundle.map[iid],
          (fieldInst, field) =>
            this.removeRefs(iid, fieldInst, toDeleteNodes, field),
          undefined,
          this._rt,
        );
        delete bundle.map[iid];
      }
    }
  }

  private removeRefs(
    parentIid: string,
    refVal: Ref,
    toDeleteNodes: string[],
    field: Field,
  ) {
    const parentKey = iidFieldKey(parentIid, field);
    const rmParentFromSet = (
      childKey: string,
      container: Map<string, Set<string>>,
    ) => {
      const parents = ensure(
        container.get(childKey),
        () => `Couldn't get parent list for key ${childKey}`,
      );
      assert(
        parents.has(parentKey),
        () =>
          `Parent list for child ${childKey} doesn't include parent ${parentKey}`,
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
      container: Map<string, Set<string>>,
    ) => {
      if (container === this._iid2Parents) {
        assert(
          childKey !== this._bundle?.root,
          "Added strong reference to root instance",
        );
      }
      const parents = xSetDefault(container, childKey, () => new Set<string>());
      assert(
        !parents.has(parentKey),
        () => `parentKey already used: ${parentKey}`,
      );
      parents.add(parentKey);
    };
    this._updateParentsForRef(refVal, field, addParentToSet);
  }

  private _updateParentsForRef(
    refVal: Ref,
    field: Field,
    updateFunc: (key: string, container: Map<string, Set<string>>) => void,
  ) {
    if ("__ref" in refVal) {
      const iid = refVal.__ref;
      if (isStrongRefField(field)) {
        updateFunc(iid, this._iid2Parents);
      } else {
        assert(
          isWeakRefField(field),
          () => `Expected weakRef, but got: ${JSON.stringify(field)}`,
        );
        updateFunc(iid, this._iid2WeakRefs);
      }
    } else {
      assert(
        "__xref" in refVal,
        () => `Expected xref, but got: ${JSON.stringify(refVal)}`,
      );
      const addr = addrKey(refVal.__xref);
      if (isStrongRefField(field)) {
        updateFunc(addr, this._xref2Parents);
      } else {
        assert(
          isWeakRefField(field),
          () => `Expected weakRef, but got: ${JSON.stringify(field)}`,
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

    for (const iid of Object.keys(bundle.map)) {
      visitRefsInFields(
        bundle.map[iid],
        (fieldInst, field) => this.addRefs(iid, fieldInst, field),
        undefined,
        this._rt,
      );
    }

    this.assertFastBundleInvariants();
  }

  private assertFastBundleInvariants() {
    const bundle = ensure(this._bundle, () => `_bundle is not set`);

    const iid2ClassName = (iid: string) => {
      const inst = ensure(
        this.objByAddr({
          uuid: ensure(this._uuid, () => `uuid is not set`),
          iid,
        }),
        `objByAddr missing iid ${iid}`,
      );
      const cls = this._instUtil.tryGetInstClass(inst);
      return cls?.name;
    };

    const getParents = (parents: Set<string>) =>
      [...parents.keys()]
        .map((addrFieldKey) => {
          const parentIid = iidFieldKey2Iid(addrFieldKey);
          const parentField = iidFieldKey2Field(addrFieldKey);
          return `(${iid2ClassName(
            parentIid,
          )}.${parentField} IID:${parentIid})`;
        })
        .join(", ");

    // Assertions for the bundle internal nodes:
    const errors: string[] = [];
    for (const iid of Object.keys(bundle.map)) {
      if (iid !== bundle.root) {
        const parents = this._iid2Parents.get(iid);
        if (!parents) {
          // Assert that every node in the bundle is reachable
          errors.push(
            `Unreachable instance of type ${bundle.map[iid].__type} found (IID ${iid})`,
          );
        } else if (parents.size !== 1) {
          // Assert that every node has exactly one strong parent (i.e. the
          // model is a tree)
          errors.push(
            `Instance (IID ${iid}) of type ${bundle.map[iid].__type} has` +
              ` multiple parents:\n` +
              getParents(parents),
          );
        } else if (
          // Assert that the parent is in the tree
          !(iidFieldKey2Iid(parents.values().next().value!) in bundle.map)
        ) {
          errors.push(
            `Instance (IID ${iid}) of type ${bundle.map[iid].__type} is in` +
              ` the bundle but its parent isn't. Parent info:` +
              getParents(parents),
          );
        }
      } else {
        // Assert that no one strongly references the root
        const parents = this._iid2Parents.get(iid);
        if (parents) {
          errors.push(
            `Root (IID ${iid}, ${bundle.map[iid].__type}) has parents:\n` +
              getParents(parents),
          );
        }
      }
    }

    // Assert that every reachable internal node is in the bundle
    const reachableNodesNotInTheBundle: string[] = [];
    for (const iid of this._iid2Parents.keys()) {
      if (!(iid in bundle.map)) {
        reachableNodesNotInTheBundle.push(iid);
      }
    }
    for (const iid of this._iid2WeakRefs.keys()) {
      if (!this._iid2Parents.has(iid) && !(iid in bundle.map)) {
        reachableNodesNotInTheBundle.push(iid);
      }
    }
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
                        () => `Couldn't get strong refs to ${iid}`,
                      ),
                    )
                  : `(WeakRefs)` +
                    getParents(
                      ensure(
                        this._iid2WeakRefs.get(iid),
                        () => `Couldn't get weak refs to ${iid}`,
                      ),
                    )
              }`;
            })
            .join("\n"),
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
          const inst = this._addr2inst.get(key);
          const cls = maybe(inst, (nonNilInst) =>
            this._instUtil.tryGetInstClass(nonNilInst),
          );
          errors.push(
            `xref ${key} of type ${cls?.name} has` +
              `unexpected parents:\n` +
              getParents(
                ensure(
                  this._xref2Parents.get(key),
                  () => `Already checked by the if condition above`,
                ),
              ),
          );
        }

        // Make sure that all references are from reachable nodes
        const parents = uniq([
          ...(this._xref2Parents.get(key)?.keys() || []),
          ...(this._xref2WeakRefs.get(key)?.keys() || []),
        ]);
        if (
          !parents.every(
            (parentKey) => iidFieldKey2Iid(parentKey) in bundle.map,
          )
        ) {
          errors.push(`Parent map of xref is out of date`);
        }
      },
    );

    if (errors.length > 0) {
      console.log(errors.join("\n"));
    }

    assert(
      errors.length === 0,
      `Bundle invariant failed\n${errors.join("\n")}`,
    );
  }
}
