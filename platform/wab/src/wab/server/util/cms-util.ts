import { CmsTable } from "@/wab/server/entities/Entities";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import {
  CmsFieldMeta,
  CmsMetaType,
  CmsRowData,
  CmsTableSchema,
  CmsTypeName,
  FilterClause,
  FilterCond,
} from "@/wab/shared/ApiSchema";
import { toVarName } from "@/wab/shared/codegen/util";
import { Dict } from "@/wab/shared/collections";
import { withoutNils } from "@/wab/shared/common";

export function traverseSchemaFields(
  fields: CmsFieldMeta[],
  processFieldCallback: (f: CmsFieldMeta) => void
): CmsFieldMeta[] {
  for (const field of fields) {
    processFieldCallback(field);

    if ("fields" in field && Array.isArray(field.fields)) {
      field.fields = traverseSchemaFields(field.fields, processFieldCallback);
    }
  }

  return fields;
}

export type FieldMetaMap = { [key: string]: CmsFieldMeta };

export function makeFieldMetaMap(
  schema: CmsTableSchema,
  fields?: string[]
): FieldMetaMap {
  const fieldsToUse = schema.fields.filter((f) => {
    if (fields && fields.length > 0) {
      // projection specified, so follow it exactly
      return fields.includes(f.identifier);
    } else {
      return !f.hidden;
    }
  });
  return Object.fromEntries(fieldsToUse.map((f) => [f.identifier, f]));
}

export function projectCmsData(
  data: CmsRowData,
  fieldMetaMap: Record<string, CmsFieldMeta>,
  locale: string
) {
  const dataDic = data[locale] ?? data[""];
  return Object.fromEntries(
    withoutNils(
      Object.entries(fieldMetaMap).map(([key, meta]) => {
        const val = dataDic?.[key] ?? data[""]?.[key];
        if (!val || !conformsToType(val, meta.type)) {
          return undefined;
        }
        return [key, val];
      })
    )
  );
}

export function normalizeCmsData(
  data: CmsRowData | undefined,
  fieldMetaMap: Record<string, CmsFieldMeta>,
  locales?: string[]
): CmsRowData {
  if (!data) {
    return { "": {} };
  }
  return Object.fromEntries(
    ["", ...(locales ?? [])].map((locale) => [
      locale,
      Object.fromEntries(
        withoutNils(
          Object.entries(fieldMetaMap).map(([key, meta]) => {
            const field = data[key];
            if (field === undefined) {
              return undefined;
            }
            // if the request has a field as null, erase it from all locales
            if (field === null) {
              return [key, null];
            }
            if (locale === "" && conformsToType(field, meta.type)) {
              return [key, field];
            }
            if (
              typeof field === "object" &&
              conformsToType(field![locale], meta.type)
            ) {
              return [key, field![locale]];
            }
            return undefined;
          })
        )
      ),
    ])
  ) as CmsRowData;
}

export function denormalizeCmsData(
  data: CmsRowData | null,
  tableSchema: CmsFieldMeta[],
  locales?: string[]
): Dict<unknown> | null {
  if (!data) {
    return null;
  }
  return Object.fromEntries(
    withoutNils(
      tableSchema.map((meta) => {
        const entries = withoutNils(
          ["", ...(locales ?? [])].map((locale) => [
            locale,
            data[locale]?.[meta.identifier],
          ])
        );
        if (entries.length === 0) {
          return undefined;
        }
        const fieldDict = Object.fromEntries(entries);
        return [meta.identifier, meta.localized ? fieldDict : fieldDict[""]];
      })
    )
  );
}

export function conformsToType(val: any, type: CmsTypeName): boolean {
  if (val == null) {
    return true;
  }

  switch (type) {
    case CmsMetaType.TEXT:
    case CmsMetaType.LONG_TEXT:
    case CmsMetaType.ENUM:
    case CmsMetaType.REF:
      return typeof val === "string";
    case CmsMetaType.LIST:
      return Array.isArray(val);
    case CmsMetaType.OBJECT:
      return typeof val === "object";
    case CmsMetaType.BOOLEAN:
      return typeof val === "boolean";
    case CmsMetaType.NUMBER:
      return typeof val === "number";
    case CmsMetaType.IMAGE:
      return typeof val === "object" && !!val.url && !!val.imageMeta;
    case CmsMetaType.FILE:
      return typeof val === "object" && !!val.url && !!val.mimetype;
    case CmsMetaType.DATE_TIME:
      // Just gonna check for string now
      return typeof val === "string";
    case CmsMetaType.COLOR:
      return typeof val === "string";
    case CmsMetaType.RICH_TEXT:
      return typeof val === "string";
  }
}

export function normalizeTableFieldName(name: string) {
  return toVarName(name);
}

export function normalizeTableSchema(schema: CmsTableSchema) {
  for (const field of schema.fields) {
    field.identifier = normalizeTableFieldName(field.identifier);
  }
  return schema;
}

//
// SQL helpers
//

function makeDataRef(opts: { useDraft?: boolean }) {
  return opts.useDraft
    ? `(CASE WHEN r.draftData IS NOT NULL THEN r.draftData ELSE r.data END)`
    : `r.data`;
}

/**
 * Assumes `r` is the alias for the `cms_row` table.
 * Returns a psql expression for the given field.
 * Returns null if the given field was not recognized.
 */
export const makeTypedFieldSql = (
  field: string,
  fieldMetaMap: FieldMetaMap,
  opts: { useDraft?: boolean }
) => {
  // Quick fix for user submitting invalid request
  if (!field) {
    return null;
  }

  const dataRef = makeDataRef(opts);
  if (field === "_id") {
    return "r.id";
  }

  // Simple field access
  const meta = fieldMetaMap[field];
  if (meta) {
    return `(${dataRef}->''->>'${meta.identifier}')::${typeToPgType(
      meta.type
    )}`;
  }

  // TODO: handle more than one level of nesting
  // TODO: allow escaping "." in field identifier
  if (field.includes(".")) {
    const [objectField, nestedField] = field.split(".");

    const objectFieldMeta = fieldMetaMap[objectField];
    if (objectFieldMeta && objectFieldMeta.type === CmsMetaType.OBJECT) {
      const nestedFieldMeta = objectFieldMeta.fields.find(
        (f) => f.identifier === nestedField
      );

      if (nestedFieldMeta) {
        return `(${dataRef}->''->'${objectFieldMeta.identifier}'->>'${
          nestedFieldMeta.identifier
        }')::${typeToPgType(nestedFieldMeta.type)}`;
      }
    }
  }

  return null;
};

export function makeSqlCondition(
  table: CmsTable,
  condition: FilterClause,
  opts: { useDraft?: boolean }
) {
  const fieldMetaMap = makeFieldMetaMap(table.schema);

  let valCount = 0;
  const valParams: Record<string, any> = {};
  const getValParam = (val: any) => {
    const valParam = `val${valCount++}`;
    valParams[valParam] = val;
    return valParam;
  };

  const buildFilterExprSql = (fieldSql: string, cond: FilterCond): string => {
    // TODO: type checking against field meta
    if (
      typeof cond === "string" ||
      typeof cond === "number" ||
      typeof cond === "boolean"
    ) {
      const eqExpr = `${fieldSql} = :${getValParam(cond)}`;
      if (cond === "false" || cond === false) {
        return `(${eqExpr} OR ${fieldSql} IS NULL)`;
      } else {
        return eqExpr;
      }
    } else if (typeof cond === "object") {
      if ("$in" in cond) {
        const vals = cond.$in;
        if (!Array.isArray(vals)) {
          throw new BadRequestError(
            `Unexpected "in" operand: ${JSON.stringify(vals)}`
          );
        } else if (vals.length === 0) {
          return "FALSE";
        } else {
          return `${fieldSql} IN (:...${getValParam(vals)})`;
        }
      } else if ("$gt" in cond) {
        return `${fieldSql} > :${getValParam(cond.$gt)}`;
      } else if ("$ge" in cond) {
        return `${fieldSql} >= :${getValParam(cond.$ge)}`;
      } else if ("$lt" in cond) {
        return `${fieldSql} < :${getValParam(cond.$lt)}`;
      } else if ("$le" in cond) {
        return `${fieldSql} <= :${getValParam(cond.$le)}`;
      } else if ("$regex" in cond) {
        return `${fieldSql} ~* :${getValParam(cond.$regex)}`;
      }
    }
    throw new BadRequestError(
      `Unknown filter condition ${JSON.stringify(cond)}`
    );
  };

  const buildFilterClause = (clause: FilterClause): string => {
    const ands: string[] = [];
    for (const key of Object.keys(clause)) {
      // First, check if the key is a logical operator.
      if (key === "$and") {
        const sub = clause[key];
        if (!Array.isArray(sub)) {
          throw new BadRequestError(
            `Unexpected "and" operand: ${JSON.stringify(sub)}`
          );
        }
        ands.push(andSql(sub.map(buildFilterClause)));
      } else if (key === "$or") {
        const sub = clause[key];
        if (!Array.isArray(sub)) {
          throw new BadRequestError(
            `Unexpected "or" operand: ${JSON.stringify(sub)}`
          );
        }
        ands.push(orSql(sub.map(buildFilterClause)));
      } else if (key === "$not") {
        ands.push(`NOT (${buildFilterClause(clause[key]!)})`);
      } else {
        // Finally, check if the key is a field.
        const fieldSql = makeTypedFieldSql(key, fieldMetaMap, opts);
        if (!fieldSql) {
          throw new BadRequestError(
            `Unknown field or logical operator "${key}"`
          );
        }

        ands.push(buildFilterExprSql(fieldSql, clause[key]));
      }
    }

    return andSql(ands);
  };

  return {
    condition: buildFilterClause(condition),
    params: valParams,
  };
}

export const typeToPgType = (type: CmsTypeName) => {
  switch (type) {
    case CmsMetaType.TEXT:
    case CmsMetaType.LONG_TEXT:
    case CmsMetaType.REF:
    case CmsMetaType.ENUM:
      return "text";
    case CmsMetaType.BOOLEAN:
      return "boolean";
    case CmsMetaType.NUMBER:
      return "numeric";
    case CmsMetaType.DATE_TIME:
      return "timestamp";
    default:
      throw new BadRequestError(`Cannot filter by a column of type ${type}`);
  }
};

function andSql(clauses: string[]) {
  return combineSql(clauses, " AND ");
}

function orSql(clauses: string[]) {
  return combineSql(clauses, " OR ");
}

function combineSql(clauses: string[], sep: string) {
  if (clauses.length === 0) {
    return "TRUE";
  } else if (clauses.length === 1) {
    return clauses[0];
  } else {
    return clauses.map((c) => `(${c})`).join(sep);
  }
}
