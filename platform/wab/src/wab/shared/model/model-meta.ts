import {
  assert,
  ensure,
  filterMapTruthy,
  isEqualWithoutKeys,
  multimap,
  tuple,
} from "@/wab/shared/common";
import type { ObjInst } from "@/wab/shared/model/classes";
import pick from "lodash/pick";
import uniqBy from "lodash/uniqBy";

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

export class MetaRuntime {
  schema: Class[];
  nextUid: number;
  clsByName: { [name: string]: Class };
  class2subclasses: Map<Class, Class[]>;

  getStrictSubclasses(cls: Class) {
    return this.class2subclasses.get(cls) ?? [];
  }

  isAbstract(cls: Class) {
    return this.getStrictSubclasses(cls).length > 0 && !cls.concrete;
  }

  getFieldByName(clsName: string, fieldName: string) {
    return ensure(
      this.allFields(this.clsByName[clsName]).find((f) => f.name === fieldName),
      `Field ${fieldName} does not exist on class ${clsName}`,
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
        `new UID of ${newNextUid} is smaller than current UID of ${this.nextUid}`,
      );
    }
    return (this.nextUid = newNextUid);
  }

  /**
   * Gives a new inst its record of field values, `$v`. It is not writable, so
   * that e.g. `Object.assign(inst, otherInst)` throws instead of making two
   * insts share a record.
   */
  initInst(inst: ModelInst, vals: Record<string, any>): void {
    Object.defineProperty(inst, "$v", {
      value: vals,
      enumerable: true,
      writable: false,
    });
  }

  reportRead(_inst: ModelInst, _name: string): void {
    // Field reads aren't tracked
  }

  writeField(inst: ModelInst, field: Field, value: unknown): void {
    (inst as InternalModelInst).$v[field.name] = value;
  }

  initializers: {
    [name: string]: (inst: any, args: any) => any;
  };

  private clsToFieldsCache = new Map<Class, Field[]>();
  private clsToFieldKeysCache = new Map<Class, Set<string>>();
  private clsToTransientFieldKeysCache = new Map<Class, Set<string>>();
  private clsToValsTemplateCache = new Map<Class, Record<string, any>>();
  private strict: boolean = true;

  constructor(schema: Class[], nextUid: number) {
    this.schema = schema;
    this.nextUid = nextUid;
    this.clsByName = Object.fromEntries(
      this.schema.map((cls: Class) => tuple(cls.name, cls)),
    );
    this.class2subclasses = multimap(
      filterMapTruthy(
        schema,
        (cls) => cls.base && tuple(this.clsByName[cls.base], cls),
      ),
    );

    this.initializers = Object.fromEntries(
      this.schema.map((cls: Class) =>
        tuple(
          cls.name,
          (inst: ModelInst, args: Record<string, any> | undefined) => {
            if (args == null) {
              args = {};
            }
            assert(
              !isModelInst(args),
              () =>
                `Constructing a ${cls.name} from another inst; pass instFieldValues(inst) instead`,
            );
            try {
              checkEqKeys(
                args,
                this.allFieldKeys(cls),
                this.allTransientFieldKeys(cls),
                cls.name,
              );
            } catch (e) {
              if (this.strict) {
                throw e;
              } else {
                console.warn(`Error instantiating ${cls.name}: ${e}`);
              }
            }
            // Copy the class's template, so that all insts of a class share one
            // shape. The inst isn't tracked yet, so skip the setters.
            const vals = { ...this.valsTemplate(cls) };
            const fieldKeys = this.allFieldKeys(cls);
            for (const key of Object.keys(args)) {
              if (fieldKeys.has(key)) {
                vals[key] = args[key];
              } else if (key !== "__type") {
                // If args was from a json bundle, then it will have the __type
                // field, which we leave out of our instance.
                inst[key] = args[key];
              }
            }
            this.initInst(inst, vals);

            inst.uid = this.mkUid();
            return inst;
          },
        ),
      ),
    );
  }

  allFields(cls: Class): Field[] {
    if (this.clsToFieldsCache.has(cls)) {
      return ensure(
        this.clsToFieldsCache.get(cls),
        `Class ${cls} does not exist in clsToFieldsCache`,
      );
    }

    const fields = uniqBy(
      [
        ...cls.fields,
        ...(cls.base ? this.allFields(this.clsByName[cls.base]) : []),
      ],
      (f: Field) => f.name,
    );
    this.clsToFieldsCache.set(cls, fields);
    return fields;
  }

  allFieldKeys(cls: Class) {
    if (this.clsToFieldKeysCache.has(cls)) {
      return ensure(
        this.clsToFieldKeysCache.get(cls),
        `Class ${cls} does not exist in clsToFieldKeysCache`,
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
        `Class ${cls} does not exist in clsToPersistentFieldKeysCache`,
      );
    }

    const fields = this.allFields(cls);
    const fieldKeys = new Set(
      fields
        .filter((f) => f.annotations.includes("Transient"))
        .map((f) => f.name),
    );
    this.clsToTransientFieldKeysCache.set(cls, fieldKeys);
    return fieldKeys;
  }

  /** The initial field values of an inst of `cls` */
  private valsTemplate(cls: Class) {
    let template = this.clsToValsTemplateCache.get(cls);
    if (!template) {
      template = {};
      for (const field of this.allFields(cls)) {
        template[field.name] = field.annotations.includes("Transient")
          ? null
          : undefined;
      }
      this.clsToValsTemplateCache.set(cls, template);
    }
    return template;
  }

  setStrict(strict: boolean) {
    return (this.strict = strict);
  }
}

// Model insts

/**
 * Base class of all model classes. The generated subclasses declare
 * `static $fields` (all fields, including inherited ones) and an accessor per
 * field they declare, which call `meta.reportRead` and `meta.writeField`.
 *
 * An inst's own internal properties are left out of its type (e.g. out of
 * `keyof`); see `InternalModelInst` and `InternalTrackedModelInst` in
 * tracking.ts.
 */
export abstract class ModelInst {
  static readonly $fields: readonly Field[] = [];
  declare uid: number;
}

/** Internal representation. Includes `$v` where field values actually live. */
export interface InternalModelInst extends ModelInst {
  readonly $v: Record<string, any>;
}

export function isModelInst(x: any): x is ModelInst {
  return x instanceof ModelInst;
}

export function instFields(inst: ModelInst): readonly Field[] {
  return (inst.constructor as typeof ModelInst).$fields;
}

/** An inst's field values as plain properties, unlike a spread of its type */
export type FieldValues<T> = { [K in keyof T]: T[K] };

/**
 * A plain object with the inst's field values. Use it instead of spreading an
 * inst, which copies no field values since they aren't own properties.
 */
export function instFieldValues<T extends ModelInst>(inst: T): FieldValues<T> {
  // Read through the accessors, so that mobx derivations track the reads
  const values: Record<string, any> = { uid: inst.uid };
  for (const field of instFields(inst)) {
    values[field.name] = inst[field.name];
  }
  return values as FieldValues<T>;
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
  clsName: string,
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
    typeof t === "string" ? JSON.stringify(t) : toTs(t),
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
      return simple("ReadonlyArray");
    case "Set":
      return simple("ReadonlyArray");
    case "Lit":
      return simple("number | string | null | undefined");
    case "Any":
      return simple("any");
    case "Optional":
      return `${renderedParams} | null | undefined`;
    case "Map":
      return `Readonly<Record<${renderedParams[0]}, ${renderedParams[1]}>>`;
    case "Or":
      return renderedParams.join(" | ");
    case "StringLiteral":
      return `${renderedParams[0]}`;
    default:
      return simple(type.type);
  }
}

/** Returns whether model instances a and b are deeply equal. */
export function areModelsEqual(a: ObjInst, b: ObjInst): boolean {
  return isEqualWithoutKeys(a, b, ["uid", "uuid"]);
}
