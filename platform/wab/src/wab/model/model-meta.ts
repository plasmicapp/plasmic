import isObject from "lodash/isObject";
import omit from "lodash/omit";
import pick from "lodash/pick";
import sortBy from "lodash/sortBy";
import uniqBy from "lodash/uniqBy";
import { coalesce, ensure, filterMapTruthy, multimap, tuple } from "../common";

export class Class {
  name: string;
  base: null | string | undefined;
  concrete: boolean;
  fields: Field[];

  constructor(args: Class) {
    Object.assign(this, pick(args, "name", "base", "concrete", "fields"));
  }
}

// BundleConst doesn't do anything right now, just means that the only expected changes are when swapping it from an old version to a new version of the object across PkgVersions.
export const FieldAnnotationValues = [
  "WeakRef",
  "Const",
  "BundleConst",
  "Transient",
] as const;
export type FieldAnnotation = (typeof FieldAnnotationValues)[number];

export class Field {
  name: string;
  type: Type;
  annotations: FieldAnnotation[];

  constructor(args: Field) {
    Object.assign(this, pick(args, "name", "type", "annotations"));
  }
}
export class Type {
  type: string;
  params: (Type | string)[];

  constructor(args: Type) {
    Object.assign(this, pick(args, "type", "params"));
  }
}

class AbstractMethodError extends Error {}

export class BaseRuntime {
  schema: Class[];
  nextUid: number;
  clsByName: { [name: string]: Class };
  class2subclasses: Map<Class, Class[]>;

  constructor(schema1: Class[], nextUid: number) {
    this.schema = schema1;
    this.nextUid = nextUid;
    this.clsByName = Object.fromEntries(
      this.schema.map((cls: /*TWZ*/ Class) => tuple(cls.name, cls))
    );
    this.class2subclasses = multimap(
      filterMapTruthy(
        schema1,
        (cls) => cls.base && tuple(this.clsByName[cls.base], cls)
      )
    );
  }

  getStrictSubclasses(cls: Class) {
    return this.class2subclasses.get(cls) ?? [];
  }

  isAbstract(cls: Class) {
    return this.getStrictSubclasses(cls).length > 0 && !cls.concrete;
  }

  allFields(cls: Class): Field[] {
    return coalesce(
      cls != null
        ? cls.fields.concat(
            cls.base ? this.allFields(this.clsByName[cls.base]) : []
          )
        : undefined,
      () => []
    );
  }
  getFieldByName(clsName: string, fieldName: string) {
    return ensure(
      this.allFields(this.clsByName[clsName]).find((f) => f.name === fieldName),
      `Field ${fieldName} does not exist on class ${clsName}`
    );
  }

  isSubclass(cls: Class, parent: Class) {
    if (cls === parent) {
      return true;
    }
    while (cls.base) {
      if (cls.base === parent.name) {
        return true;
      }
      cls = this.clsByName[cls.base];
    }
    return false;
  }

  mkUid() {
    return (this.nextUid += 1);
  }

  getNextUid() {
    return this.nextUid;
  }

  setNextUid(newNextUid) {
    if (newNextUid < this.nextUid) {
      throw new Error(
        `new UID of ${newNextUid} is smaller than current UID of ${this.nextUid}`
      );
    }
    return (this.nextUid = newNextUid);
  }

  readField(x, f) {
    throw new AbstractMethodError();
  }

  writeField(x, f, y?) {
    throw new AbstractMethodError();
  }
}

export class MetaRuntime extends BaseRuntime {
  initializers: {
    [name: string]: (inst: any, args: any) => any;
  };

  private clsToFieldsCache = new Map<Class, Field[]>();
  private clsToFieldKeysCache = new Map<Class, Set<string>>();
  private clsToTransientFieldKeysCache = new Map<Class, Set<string>>();
  private strict: boolean = true;

  constructor(schema: Class[], nextUid: number) {
    super(schema, nextUid);

    this.initializers = Object.fromEntries(
      this.schema.map((cls: /*TWZ*/ Class) =>
        tuple(cls.name, (inst: ObjInstBase, args: Partial<ObjInstBase>) => {
          if (this.isAbstract(cls)) {
            throw new Error("cannot instantiate abstract class");
          }
          if (args == null) {
            args = {};
          }
          try {
            checkEqKeys(
              args,
              this.allFieldKeys(cls),
              this.allTransientFieldKeys(cls),
              cls.name
            );
          } catch (e) {
            if (this.strict) {
              throw e;
            } else {
              console.warn(`Error instantiating ${cls.name}: ${e}`);
            }
          }
          inst = Object.assign(inst, args);

          // If this args was from json bundle, then it will have the __type field.
          // We remove it from our instance.
          if ("__type" in args) {
            delete inst["__type"];
          }

          inst.uid = this.mkUid();
          return inst;
        })
      )
    );
  }

  allFields(cls: Class): Field[] {
    if (this.clsToFieldsCache.has(cls)) {
      return ensure(
        this.clsToFieldsCache.get(cls),
        `Class ${cls} does not exist in clsToFieldsCache`
      );
    }

    const fields = uniqBy(
      [
        ...cls.fields,
        ...(cls.base ? this.allFields(this.clsByName[cls.base]) : []),
      ],
      (f: /*TWZ*/ Field) => f.name
    );
    this.clsToFieldsCache.set(cls, fields);
    return fields;
  }

  allFieldKeys(cls: Class) {
    if (this.clsToFieldKeysCache.has(cls)) {
      return ensure(
        this.clsToFieldKeysCache.get(cls),
        `Class ${cls} does not exist in clsToFieldKeysCache`
      );
    }

    const fields = this.allFields(cls);
    const fieldKeys = new Set(fields.map((f) => f.name));
    this.clsToFieldKeysCache.set(cls, fieldKeys);
    return fieldKeys;
  }

  allTransientFieldKeys(cls: Class) {
    if (this.clsToTransientFieldKeysCache.has(cls)) {
      return ensure(
        this.clsToTransientFieldKeysCache.get(cls),
        `Class ${cls} does not exist in clsToPersistentFieldKeysCache`
      );
    }

    const fields = this.allFields(cls);
    const fieldKeys = new Set(
      fields
        .filter((f) => f.annotations.includes("Transient"))
        .map((f) => f.name)
    );
    this.clsToTransientFieldKeysCache.set(cls, fieldKeys);
    return fieldKeys;
  }

  readField(x: ObjInstBase, f: /*TWZ*/ string) {
    return x[f];
  }

  writeField(x: ObjInstBase, f: /*TWZ*/ string, y: any) {
    return (x[f] = y);
  }

  setStrict(strict: boolean) {
    return (this.strict = strict);
  }
}

// A Bundle is a JSON object containing {root: Int, map: Map[Int, Obj]}.
export interface ObjInstBase {
  uid: number;
}

export function isStrongRefField(f: Field) {
  // We assume no @WeakRef implies StrongRef
  return !isWeakRefField(f);
}

export function isWeakRefField(f: Field) {
  return f.annotations.includes("WeakRef");
}

// We always exclude __type and uid from x; __type comes from unbundling
// the json objects, and uid from cloning existing instances.
const excludeKeys = ["__type", "uid"];

export function checkEqKeys(
  x: any,
  allKeys: Set<string>,
  transientKeys: Set<string>,
  clsName: string
) {
  let diff = "";
  for (const key of Object.keys(x)) {
    if (excludeKeys.includes(key) || transientKeys.has(key)) {
      continue;
    }
    if (!allKeys.has(key)) {
      diff += `  + ${key}\n`;
    }
  }
  for (const key of allKeys) {
    if (excludeKeys.includes(key) || transientKeys.has(key)) {
      continue;
    }
    if (!(key in x)) {
      diff += `  - ${key}\n`;
    }
  }
  if (diff) {
    throw new Error(`Unexpected fields on [${clsName}]:\n${diff.trim()}`);
  }
}

export function toTs(type: Type) {
  const renderedParams = type.params.map((t) =>
    typeof t === "string" ? JSON.stringify(t) : toTs(t)
  );
  const simple = (name: string) => {
    if (type.params.length === 0) {
      return name;
    } else {
      return `${name}<${renderedParams.join(", ")}>`;
    }
  };
  switch (type.type) {
    case "String":
      return simple("string");
    case "Number":
      return simple("number");
    case "Bool":
      return simple("boolean");
    case "List":
      return simple("Array");
    case "Set":
      return simple("Array");
    case "Lit":
      return simple("number | string | null | undefined");
    case "Any":
      return simple("any");
    case "Optional":
      return `${renderedParams} | null | undefined`;
    case "Map":
      return `{ [key: ${renderedParams[0]}]: ${renderedParams[1]}; }`;
    case "Or":
      return renderedParams.join(" | ");
    case "StringLiteral":
      return `${renderedParams[0]}`;
    default:
      return simple(type.type);
  }
}

/**
 * Converts the model structure to one that:
 *
 * - has a stable order of keys, for consistent JSON.stringify's
 * - has no uid's, so you can compare the JSON.stringify's for value-equality
 * - has repeated elements referenced by their IDs
 */
export function withoutUids(
  x_: any,
  { includeUids = false }: { includeUids?: boolean } = {}
) {
  const seen = {};
  let counter = 0;
  function rec(x: any) {
    if (x == null) {
      return x;
      // We must short-circuit functions because Fiber.
    } else if (typeof x === "function") {
      return x;
    } else if (Array.isArray(x)) {
      return Array.from(x).map((e) => rec(e));
    } else if (isObject(x)) {
      if (x["uid"] != null) {
        const uid = x["uid"];
        if (x["uid"] in seen) {
          return `[seen@${seen[uid]}]`;
        }
        seen[uid] = counter++;
      }
      return Object.fromEntries(
        sortBy(
          Object.entries(includeUids ? x : omit(x, "uid", "uuid")),
          ([k, v]) => k
        ).map(([k, v]) => tuple(k, rec(v)))
      );
    } else {
      return x;
    }
  }
  return rec(x_);
}
