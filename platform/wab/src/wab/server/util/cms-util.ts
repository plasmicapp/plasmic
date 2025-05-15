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
import { assert, withoutNils } from "@/wab/shared/common";

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

export function makeFieldMetaMap(schema: CmsTableSchema, fields?: string[]) {
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

export const makeTypedFieldSql = (
  fieldMeta: CmsFieldMeta,
  opts: { useDraft?: boolean }
) => {
  const dataRef = opts.useDraft
    ? `(CASE WHEN r.draftData IS NOT NULL THEN r.draftData ELSE r.data END)`
    : `r.data`;
  return `(${dataRef}->''->>'${fieldMeta.identifier}')::${typeToPgType(
    fieldMeta.type
  )}`;
};

export function makeSqlCondition(
  table: CmsTable,
  condition: FilterClause,
  opts: { useDraft?: boolean }
) {
  const dataRef = opts.useDraft
    ? `(CASE WHEN r.draftData IS NOT NULL THEN r.draftData ELSE r.data END)`
    : `r.data`;
  const fieldToMeta = Object.fromEntries(
    table.schema.fields.map((f) => [f.identifier, f])
  );

  let valCount = 0;
  const valParams: Record<string, any> = {};
  const getValParam = (val: any) => {
    const valParam = `val${valCount++}`;
    valParams[valParam] = val;
    return valParam;
  };

  const buildFilterCond = (field: string, cond: FilterCond) => {
    // TODO: type checking against field meta
    if (
      typeof cond === "string" ||
      typeof cond === "number" ||
      typeof cond === "boolean"
    ) {
      return `= :${getValParam(cond)}`;
    } else if (typeof cond === "object") {
      if ("$in" in cond) {
        const vals = cond.$in;
        if (!Array.isArray(vals)) {
          throw new BadRequestError(
            `Unexpected "in" operand: ${JSON.stringify(vals)}`
          );
        }
        return `IN (:...${getValParam(vals)})`;
      } else if ("$gt" in cond) {
        return `> :${getValParam(cond.$gt)}`;
      } else if ("$ge" in cond) {
        return `>= :${getValParam(cond.$ge)}`;
      } else if ("$lt" in cond) {
        return `< :${getValParam(cond.$lt)}`;
      } else if ("$le" in cond) {
        return `<= :${getValParam(cond.$le)}`;
      } else if ("$regex" in cond) {
        return `~* :${getValParam(cond.$regex)}`;
      }
    }
    throw new BadRequestError(
      `Unknown filter condition ${JSON.stringify(cond)}`
    );
  };

  const readTypedField = (field: string) => {
    const meta = fieldToMeta[field];
    return makeTypedFieldSql(meta, opts);
  };

  const buildFilterClause = (clause: FilterClause) => {
    const ands: string[] = [];
    for (const key of Object.keys(clause)) {
      if (key in fieldToMeta) {
        const filterCond = `${readTypedField(key)} ${buildFilterCond(
          key,
          clause[key]
        )}`;
        if (clause[key] === "false" || clause[key] === false) {
          ands.push(`(${filterCond} OR ${readTypedField(key)} IS NULL)`);
        } else {
          ands.push(filterCond);
        }
      } else if (key === "_id") {
        ands.push(`id ${buildFilterCond(key, clause[key])}`);
      } else if (key === "$and") {
        const sub = clause[key];
        assert(Array.isArray(sub), "All subclauses should be arrays");
        ands.push(`(${sub.map(buildFilterClause).join(" AND ")})`);
      } else if (key === "$or") {
        const sub = clause[key];
        assert(Array.isArray(sub), "All subclauses should be arrays");
        ands.push(`(${sub.map(buildFilterClause).join(" OR ")})`);
      } else if (key === "$not") {
        ands.push(`NOT (${buildFilterClause(clause[key]!)})`);
      } else if (key.includes(".")) {
        const [objectField, nestedField] = key.split(".");

        const objectFieldMeta = table.schema.fields.find(
          (f) => f.identifier === objectField && f.type === CmsMetaType.OBJECT
        );

        if (objectFieldMeta && objectFieldMeta.type === CmsMetaType.OBJECT) {
          const nestedFieldMeta = objectFieldMeta.fields.find(
            (f) => f.identifier === nestedField
          );

          if (objectField in fieldToMeta && nestedFieldMeta) {
            const filterCond = `(${dataRef}->''->'${
              objectFieldMeta.identifier
            }'->>'${nestedFieldMeta.identifier}')::${typeToPgType(
              nestedFieldMeta.type
            )} ${buildFilterCond(key, clause[key])}`;
            ands.push(filterCond);
          }
        } else {
          throw new BadRequestError(`Unknown filter operator ${key}`);
        }
      } else {
        throw new BadRequestError(`Unknown filter operator ${key}`);
      }
    }
    return ands.join(" AND ");
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
