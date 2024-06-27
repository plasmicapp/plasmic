import { coalesce, simpleHash, simpleWords, tuple } from "@/wab/shared/common";
import {
  Class,
  Field,
  FieldAnnotation,
  FieldAnnotationValues,
  MetaRuntime,
  Type,
  toTs,
} from "@/wab/shared/model/model-meta";
import fs from "fs";
import assignIn from "lodash/assignIn";
import difference from "lodash/difference";
import flattenDeep from "lodash/flattenDeep";

const modelPegParser = require("@/wab/gen/modelPegParser");

export const parse = (x: /*TWZ*/ string) => modelPegParser.parse(clean(x));

export function clean(x: string) {
  let i;
  let prevLevel = 0;
  const res: string[] = [];
  for (const line of x.split("\n")) {
    if (line.match(/^\s*(#.*)?$/) != null) {
      continue;
    }
    const match = /^( *)[^# ]/g.exec(line);
    if (match != null) {
      const level = match[1].length / 2;
      const indents = (() => {
        let asc, end;
        const result: string[] = [];
        for (
          i = 0, end = Math.max(0, level - prevLevel), asc = 0 <= end;
          asc ? i < end : i > end;
          asc ? i++ : i--
        ) {
          result.push("{{{");
        }
        return result;
      })();
      const dedents = (() => {
        let asc1, end1;
        const result1: string[] = [];
        for (
          i = 0, end1 = Math.max(0, prevLevel - level), asc1 = 0 <= end1;
          asc1 ? i < end1 : i > end1;
          asc1 ? i++ : i--
        ) {
          result1.push("}}}");
        }
        return result1;
      })();
      const newline = indents.concat(dedents).join(" ");
      if (newline !== "") {
        res.push(newline);
      }
      prevLevel = level;
    }
    res.push(line);
  }
  res.push(
    (() => {
      let asc2, end2;
      const result2: string[] = [];
      for (
        i = 0, end2 = Math.max(0, prevLevel), asc2 = 0 <= end2;
        asc2 ? i < end2 : i > end2;
        asc2 ? i++ : i--
      ) {
        result2.push("}}}");
      }
      return result2;
    })().join(" ")
  );
  return res.join("\n");
}

export const transform = (parsed): Class[] =>
  flattenDeep(Array.from(parsed).map((cls) => ast.cls(cls, null)));

const ast = {} as any;

ast.type = (t: {
  params: { params: null; type: string }[] | null;
  type: string;
}) => {
  if (typeof t === "string") {
    return t;
  }
  const { type, params } = t;
  return new Type({
    type,
    params: (params || []).map((p) => ast.type(p)),
  });
};

ast.field = ({
  name,
  type /*TWZ*/,
  annotations,
}:
  | {
      name: string;
      type: { params: null; type: string };
      annotations?: string[];
    }
  | {
      name: string;
      type: { params: { params: null; type: string }[]; type: string };
      annotations?: string[];
    }) => {
  const missing = difference(annotations ?? [], FieldAnnotationValues);
  if (missing.length > 0) {
    throw new Error("Unknown field annotations: " + JSON.stringify(missing));
  }
  return new Field({
    name,
    type: ast.type(type),
    annotations: annotations as FieldAnnotation[],
  });
};
type ClassWithSubclasses = [Class, ClassWithSubclasses[]];
ast.cls = function (cls, base): ClassWithSubclasses {
  return tuple(
    new Class(
      assignIn({}, cls, base != null ? { base } : {}, {
        fields: coalesce(
          cls.fields != null ? cls.fields.map(ast.field) : undefined,
          () => []
        ),
      })
    ),
    Array.from(cls.subclasses != null ? cls.subclasses : []).map((c) =>
      ast.cls(c, cls.name)
    )
  );
};

export function writeTypescriptClasses(schema: string, classesPath: string) {
  const classes = transform(parse(schema));
  const meta = new MetaRuntime(classes, 0);

  const classCodeParts = Array.from(classes).map((cls) => {
    const fields = meta
      .allFields(cls)
      .map(
        (field) =>
          `${field.annotations.includes("Const") ? "readonly " : ""}${
            field.name
          }${field.annotations.includes("Transient") ? "?" : ""}: ${toTs(
            field.type
          )}${field.annotations.includes("Transient") ? " = null" : ""}${
            field.annotations ? ` /* ${field.annotations} */` : ""
          }`
      );
    const fieldsList = Array.from(fields)
      .map((field) => {
        return `${field};`;
      })
      .join("\n");
    const params = meta
      .allFields(cls)
      .map(
        (field) =>
          `${field.annotations.includes("Const") ? "readonly " : ""}${
            field.name
          }${field.annotations.includes("Transient") ? "?" : ""}: ${toTs(
            field.type
          )}${field.annotations ? ` /* ${field.annotations} */` : ""}`
      );
    const paramsList = Array.from(params)
      .map((field) => {
        return `${field};`;
      })
      .join("\n");

    const subclasses =
      meta.getStrictSubclasses(cls).length > 0
        ? meta.getStrictSubclasses(cls)
        : undefined;

    // All superclasses are abstract by default, unless marked concrete.
    const isAbstract = meta.isAbstract(cls);

    const union = `type Known${cls.name} = ${(subclasses ?? [])
      .map((subCls) => `Known${subCls.name}`)
      .concat(isAbstract ? [] : [`Cls${cls.name}`])
      .join(" | ")};`;
    // We want these functions like isKnownExpr(), ensureKnownExpr(), etc. to only accept types T where there's an
    // intersection between T and the type being checked for,
    // so that you can't just call things like isKnownExpr(arg).
    // We always accept ObjInst as a special case since it's common in our code at the moment to check which sub-type an ObjInst is.
    // Ideally ObjInst is actually a union of all the known types rather than just a base interface.
    const typeSig = `[Extract<T, ${cls.name}>] extends [never] ? never : T`;
    const isKnowns = `export function isKnown${cls.name}<T>(x: ${typeSig}): x is [Extract<T, ${cls.name}>] extends [never]
  ? never
  : ${cls.name} extends T // Needed when T is any
  ? ${cls.name}
  : Extract<T, ${cls.name}> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof Base${cls.name};
}`;
    const discriminator = isAbstract
      ? ``
      : `export function isExactly${cls.name}(x: any): x is ${
          cls.name
        } { return x?.['typeTag'] === ${JSON.stringify(cls.name)}; }`;
    // In ensureMaybeKnownX, for some reason, can't just do assert(!x || isKnownX(x)). TS generics not happy.
    const ensures = `
    export function ensureKnown${cls.name}<T>(x: ${typeSig}): ${cls.name} {
      assert(isKnown${cls.name}(x), () => mkUnexpectedTypeMsg([${cls.name}], x));
      return x;
    }
    export function ensureMaybeKnown${cls.name}<T>(x: ${typeSig}): ${cls.name} | undefined | null {
      if (x===undefined) {
        return undefined;
      }
      if (x===null) {
        return null;
      }
      return ensureKnown${cls.name}(x as any);
    }
    `;

    const typeTag = `get typeTag(): ${JSON.stringify(cls.name)} {
        return ${JSON.stringify(cls.name)};
      }`;

    const typestamp = `
    static isKnown(x: any): x is ${cls.name} { return isKnown${cls.name}(x); }
    static getType(): ${cls.name} { throw new Error(); }
    static modelTypeName = ${JSON.stringify(cls.name)};
    `;

    return `\
${union}
${isKnowns}
${discriminator}
${ensures}
export type ${cls.name} = Known${cls.name};
export interface ${cls.name}Params {
  ${paramsList}
}

abstract class Base${cls.name} ${
      cls.base != null ? `extends Base${cls.base}` : ""
    } {
  ${typestamp}
  constructor(args: ${cls.name}Params | Sentinel) {
    ${cls.base != null ? "super(sentinel);" : ""}
    if (args !== sentinel) {
      meta.initializers.${cls.name}(this, args);
    }
  }
  uid: number;
  ${fieldsList}
}
${
  !isAbstract
    ? `class Cls${cls.name} extends Base${cls.name} {
    ${typeTag}
}`
    : ""
}
export const ${cls.name} = ${isAbstract ? "Base" : "Cls"}${cls.name};
\
`;
  });
  const classCode = `\
import {meta} from "@/wab/shared/model/classes-metas";
import {assert, mkUnexpectedTypeMsg} from "@/wab/shared/common";
class Sentinel { tag: 'SENTINEL' = 'SENTINEL' };
const sentinel = new Sentinel();
import type { ReactElement } from "react";
${classCodeParts.join("\n")}\
export type Val = string | number | {};
export const justClasses = { ${classes
    .map((cls) => cls.name)
    .join(", ")} } as const;
export type ObjInst = ${classes.map((cls) => cls.name).join(" | ")};
`;
  fs.writeFileSync(classesPath, classCode);
  return prettierFile(classesPath);
}

export function writeClassesMetas(schema: string, outfile: string) {
  const classes = transform(parse(schema));
  const meta = new MetaRuntime(classes, 0);
  const makeType = (type: Type) => `new Type({
    type: "${type.type}", params: [
      ${type.params
        .map((t) => (typeof t === "string" ? JSON.stringify(t) : makeType(t)))
        .join(", ")}
    ]
  })`;
  const classesStruct = Object.fromEntries(
    classes.map((cls) =>
      tuple(cls.name, {
        ...cls,
        fields: Object.fromEntries(
          meta.allFields(cls).map((field) => tuple(field.name, field))
        ),
      })
    )
  );
  const metaCode = `
  import {Class, Field, Type, MetaRuntime} from "@/wab/shared/model/model-meta";
  const CLASSES = [
    ${classes
      .map(
        (clz) => `new Class({
      name: "${clz.name}",
      base: ${clz.base ? `"${clz.base}"` : "null"},
      concrete: ${clz.concrete},
      fields: [
        ${clz.fields
          .map(
            (field) => `
          new Field({
            name: "${field.name}",
            type: ${makeType(field.type)},
            annotations: ${JSON.stringify(field.annotations)}
          })
        `
          )
          .join(", ")}
      ]
    })`
      )
      .join(", ")}
  ];
  export const CLASSES_STRUCT = ${JSON.stringify(classesStruct)} as const;
  export const meta = new MetaRuntime(CLASSES, 3000000);
  export const modelSchemaHash = ${simpleHash(clean(schema))};
`;
  fs.writeFileSync(outfile, metaCode);
  return prettierFile(outfile);
}

function prettierFile(file: string) {
  const ChildProc = require("child_process");
  return ChildProc.spawnSync(
    "pre-commit",
    simpleWords(`run prettier --files ${file}`),
    { stdio: "inherit" }
  );
}
