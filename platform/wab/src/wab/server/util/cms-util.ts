import { DbMgr } from "@/wab/server/db/DbMgr";
import { CmsRow, CmsTable } from "@/wab/server/entities/Entities";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import {
  CmsFieldMeta,
  CmsLocaleSpecificData,
  CmsMetaType,
  CmsNestedFieldMeta,
  CmsRef,
  CmsRowData,
  CmsRowId,
  CmsTableId,
  CmsTableSchema,
  CmsTypeName,
  isNestedFieldType,
} from "@/wab/shared/ApiSchema";
import { FilterClause, FilterCond } from "@/wab/shared/api/cms";
import { toVarName } from "@/wab/shared/codegen/util";
import { Dict } from "@/wab/shared/collections";
import {
  ensure,
  notNil,
  pathGet,
  pathSet,
  unexpected,
  withoutNils,
  xDifference,
} from "@/wab/shared/common";
import L from "lodash";

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

export function makeFieldMetaMap(schema: CmsTableSchema): FieldMetaMap {
  const fieldsToUse = schema.fields.filter((f) => !f.hidden);
  return Object.fromEntries(fieldsToUse.map((f) => [f.identifier, f]));
}

const SELECTION_MAX_DEPTH = 3;

/** A ref field with nested fields that references a table. */
export interface RootSelection {
  table: CmsTable;
  /**
   * Map from dot-separated field path to selection.
   * - `LeafSelection` means the field is selected
   * - `RefSelection` means the field AND nested ref fields are selected
   */
  fields: Map<string, LeafSelection | RefSelection>;
}

/** A normal field that does not have nested fields. */
export interface LeafSelection {
  type: "leaf";
  field: CmsFieldMeta;
}

/** A ref field with nested fields that references a table. */
export interface RefSelection {
  type: "ref";
  /** Root field of previous table to access ref. */
  field: CmsRef | CmsNestedFieldMeta;
  /** Nested field path to access ref. Empty if root is ref. */
  nestedFieldPath: string[];
  /** Table of ref. */
  table: CmsTable;
  /**
   * Map from dot-separated field path to selection.
   * - `LeafSelection` means the field is selected
   * - `RefSelection` means the field AND nested ref fields are selected
   */
  fields: Map<string, LeafSelection | RefSelection>;
}

/**
 * Builds a tree representing the selected fields.
 *
 * Throws BadRequestError on validation errors.
 */
export async function makeSelectionTree(
  tableCache: CmsTableCache,
  table: CmsTable,
  fieldPaths: string[]
): Promise<RootSelection> {
  const partitionedPaths: PartitionedPath[] = [];
  for (const fieldPath of fieldPaths) {
    partitionedPaths.push(
      await toPartitionedPath(tableCache, table, fieldPath)
    );
  }

  return await makeSelectionTreeInternal(
    tableCache,
    table,
    partitionedPaths.filter(notNil),
    0
  );
}

/** Recursive function to build selection tree. */
async function makeSelectionTreeInternal(
  tableCache: CmsTableCache,
  table: CmsTable,
  partitionedPaths: PartitionedPath[],
  depth: number
): Promise<RootSelection> {
  // For each partitioned path, group them either into result or refPaths.
  const result = new Map<string, LeafSelection | RefSelection>();
  const refPaths = new Map<
    string,
    {
      refPartition: RefPartition;
      paths: PartitionedPath[];
    }
  >();
  for (const partitionedPath of partitionedPaths) {
    const split = shiftPartitionedPath(partitionedPath);
    if (!Array.isArray(split)) {
      // If TerminalPartition, set a LeafSelection.
      const terminalPartition = split;
      const terminalFields =
        terminalPartition === "*"
          ? table.schema.fields.filter((f) => !f.hidden)
          : [terminalPartition];
      for (const field of terminalFields) {
        result.set(field.identifier, { type: "leaf", field });
      }
    } else {
      // If RefPartition, group all paths for that ref and recurse.
      const [refPartition, restPartitions] = split;
      let refPath = refPaths.get(refPartition.path);
      if (!refPath) {
        refPath = {
          refPartition,
          paths: [],
        };
        refPaths.set(refPartition.path, refPath);
      }
      refPath.paths.push(restPartitions);
    }
  }

  // For each RefPartition, recurse and set a RefSelection.
  for (const [path, { refPartition, paths }] of refPaths.entries()) {
    const refSelection = await makeSelectionTreeInternal(
      tableCache,
      refPartition.table,
      paths,
      depth + 1
    );
    result.set(path, {
      type: "ref",
      field: refPartition.field,
      nestedFieldPath: refPartition.nestedFieldPath,
      ...refSelection,
    });
  }

  return {
    table,
    fields: result,
  };
}

type RefPartition = {
  /** Used for grouping, e.g. "rootNestedField.nestedField.ref" */
  path: string;
  field: RefSelection["field"];
  nestedFieldPath: RefSelection["nestedFieldPath"];
  table: RefSelection["table"];
};
type TerminalPartition = "*" | CmsFieldMeta;
type PartitionedPath = [...RefPartition[], TerminalPartition];

function isRefPartition(
  x: RefPartition | TerminalPartition
): x is RefPartition {
  return typeof x === "object" && "table" in x;
}

function shiftPartitionedPath(
  x: PartitionedPath
): TerminalPartition | [RefPartition, PartitionedPath] {
  const [firstPartition, ...restPartitions] = x;
  if (restPartitions.length === 0) {
    return firstPartition as TerminalPartition;
  } else {
    return [firstPartition as RefPartition, restPartitions as PartitionedPath];
  }
}

interface ToPartitionedPathContext {
  tableCache: CmsTableCache;
  fieldPath: string;
  fieldIds: string[];
}

/**
 * Partitions a field path by ref into an array of partitions.
 *
 * The tail is a TerminalPartition, either a "*" or a single CmsFieldMeta.
 * It is preceded by 0 or more RefPartitions.
 *
 * Nested fields only return the root nested field unless a ref is found.
 *
 * Examples:
 * - "name" => [name]
 * - "ref" => [ref]
 * - "ref.name" => [[ref], name]
 * - "object.name" => [object]
 * - "list.ref.object.name" => [[list, ref], object]
 */
export async function toPartitionedPath(
  tableCache: CmsTableCache,
  rootTable: CmsTable,
  fieldPath: string
): Promise<PartitionedPath> {
  const refPartitions: RefPartition[] = [];
  const fieldIds = fieldPath.split(".");
  const ctx: ToPartitionedPathContext = {
    tableCache,
    fieldPath,
    fieldIds,
  };

  let curTable = rootTable;
  while (fieldIds.length > 0) {
    const partition = await iterateUntilPartition(ctx, curTable);
    if (isRefPartition(partition)) {
      curTable = partition.table;
      refPartitions.push(partition);
      if (refPartitions.length > SELECTION_MAX_DEPTH) {
        throw new BadRequestError(
          `Validation error for "${fieldPath}": cannot select more than ${SELECTION_MAX_DEPTH} levels deep`
        );
      }
    } else {
      return [...refPartitions, partition];
    }
  }

  // iterateUntilPartition should eventually return TerminalPartition or throw
  unexpected();
}

/** Consumes fieldIds until next partition is found, or throw on error. */
async function iterateUntilPartition(
  ctx: ToPartitionedPathContext,
  table: CmsTable
): Promise<RefPartition | TerminalPartition> {
  const { tableCache, fieldPath, fieldIds } = ctx;

  const fieldId = ensure(fieldIds.shift(), "missing next fieldId");
  if (fieldId === "*") {
    if (fieldIds.length === 0) {
      return "*";
    } else {
      throw new BadRequestError(
        `Validation error for "${fieldPath}": cannot subfield "*"`
      );
    }
  }

  const fieldMeta = findFieldMetaOrThrow(ctx, table.schema, fieldId);

  if (fieldIds.length === 0) {
    return fieldMeta;
  } else if (fieldMeta.type === CmsMetaType.REF) {
    const refTable = await tableCache.get(fieldMeta.tableId);
    return {
      path: fieldId,
      field: fieldMeta,
      nestedFieldPath: [],
      table: refTable,
    };
  } else if (isNestedFieldType(fieldMeta)) {
    return iterateNestedUntilPartition(ctx, fieldMeta);
  } else {
    throw new BadRequestError(
      `Validation error for "${fieldPath}": cannot subfield "${fieldId}"`
    );
  }
}

/** Consumes fieldIds until next partition in nested field is found, or throw on error. */
async function iterateNestedUntilPartition(
  ctx: ToPartitionedPathContext,
  rootFieldMeta: CmsNestedFieldMeta
): Promise<RefPartition | TerminalPartition> {
  const { tableCache, fieldPath, fieldIds } = ctx;
  const nestedFieldPath: string[] = [];

  let curNestedField = rootFieldMeta;
  while (fieldIds.length > 0) {
    const fieldId = ensure(fieldIds.shift(), "missing next fieldId");
    const fieldMeta = findFieldMetaOrThrow(ctx, curNestedField, fieldId);

    if (fieldIds.length === 0) {
      // no ref found and all subfields validated,
      // return root nested field as terminal partition
      return rootFieldMeta;
    }

    nestedFieldPath.push(fieldId);

    if (fieldMeta.type === CmsMetaType.REF) {
      return {
        path: `${rootFieldMeta.identifier}.${nestedFieldPath.join(".")}`,
        field: rootFieldMeta,
        nestedFieldPath,
        table: await tableCache.get(fieldMeta.tableId),
      };
    } else if (isNestedFieldType(fieldMeta)) {
      curNestedField = fieldMeta;
    } else {
      throw new BadRequestError(
        `Validation error for "${fieldPath}": cannot subfield "${fieldId}"`
      );
    }
  }

  unexpected();
}

function findFieldMetaOrThrow(
  { fieldIds }: ToPartitionedPathContext,
  schema: { fields: CmsFieldMeta[] },
  fieldId: string
) {
  const fieldMeta = schema.fields.find((f) => f.identifier === fieldId);
  if (!fieldMeta) {
    throw new BadRequestError(
      `Validation error for "${fieldIds}": cannot find "${fieldId}"`
    );
  }

  return fieldMeta;
}

/**
 * Projects a CMS row's data based on the table's selection.
 * Replaces refs with nested row data if the row cache is present.
 */
export function projectCmsData(
  row: CmsRow,
  locale: string,
  useDraft: boolean,
  selection: RootSelection,
  rowCache?: CmsRowCache
): CmsLocaleSpecificData {
  const result: CmsLocaleSpecificData = {};
  const rowData = useDraft ? row.draftData ?? row.data : row.data;

  for (const fieldSelection of selection.fields.values()) {
    const field = fieldSelection.field;
    const fieldValue: unknown =
      rowData?.[locale]?.[field.identifier] ??
      rowData?.[""]?.[field.identifier];

    if (fieldValue === null || fieldValue === undefined) {
      continue;
    }

    if (!conformsToType(fieldValue, fieldSelection.field.type)) {
      continue;
    }

    result[field.identifier] = fieldValue;

    // Replace refs with nested row data if the row cache is present.
    // The row cache is needed to get nested rows.
    if (rowCache && fieldSelection.type === "ref") {
      // Get all refs and the rows that will replace them.
      const refs = getRefPathsAndIds(fieldValue, fieldSelection);
      const refsToReplace = refs
        .map((ref) => ({
          path: ref.path,
          row: rowCache.getCached(fieldSelection.table.id, ref.value),
        }))
        .filter((x): x is { path: (string | number)[]; row: CmsRow } =>
          notNil(x.row)
        );

      if (refsToReplace.length > 0) {
        // Deep clone only if there is anything to replace.
        // This avoids incorrect projections and circular references,
        // since list/object field data could be shared via the row cache.
        result[field.identifier] = L.cloneDeep(fieldValue);

        for (const { path: refPath, row: refRow } of refsToReplace) {
          pathSet(
            result,
            [field.identifier, ...refPath],
            projectCmsData(refRow, locale, useDraft, fieldSelection, rowCache)
          );
        }
      }
    }
  }

  return result;
}

export function getRefIds(
  value: unknown,
  refSelection: RefSelection
): CmsRowId[] {
  return getRefPathsAndIds(value, refSelection).map((x) => x.value);
}

function getRefPathsAndIds(
  value: unknown,
  refSelection: RefSelection
): { path: (string | number)[]; value: CmsRowId }[] {
  return getNestedPathsAndValues(value, refSelection).filter(
    (x): x is { path: (string | number)[]; value: CmsRowId } =>
      typeof x.value === "string" && !!x.value
  );
}

function getNestedPathsAndValues(
  value: unknown,
  refSelection: RefSelection
): { path: (string | number)[]; value: unknown }[] {
  switch (refSelection.field.type) {
    case CmsMetaType.REF:
      return [
        {
          path: [],
          value,
        },
      ];
    case CmsMetaType.OBJECT:
      if (typeof value === "object" && value) {
        return [
          {
            path: refSelection.nestedFieldPath,
            value: pathGet(value, refSelection.nestedFieldPath),
          },
        ];
      } else {
        return [];
      }
    case CmsMetaType.LIST:
      if (Array.isArray(value)) {
        return value.map((el, index) => {
          return {
            path: [index, ...refSelection.nestedFieldPath],
            value: pathGet(el, refSelection.nestedFieldPath),
          };
        });
      } else {
        return [];
      }
  }
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

export class CmsTableCache {
  private cache = new Map<CmsTableId, CmsTable>();

  constructor(private readonly dbMgr: Pick<DbMgr, "getCmsTableById">) {}

  fill(table: CmsTable): void {
    this.cache.set(table.id, table);
  }

  async get(tableId: CmsTableId): Promise<CmsTable> {
    const cached = this.cache.get(tableId);
    if (cached) {
      return cached;
    }

    const table = await this.dbMgr.getCmsTableById(tableId);
    this.fill(table);
    return table;
  }
}

export class CmsRowCache {
  private cache = new Map<CmsTableId, Map<CmsRowId, CmsRow>>();

  constructor(
    private readonly dbMgr: Pick<DbMgr, "queryCmsRows">,
    private readonly queryOpts: Parameters<DbMgr["queryCmsRows"]>[2]
  ) {}

  fill(tableId: CmsTableId, rows: CmsRow[]): void {
    let cachedRows = this.cache.get(tableId);
    if (!cachedRows) {
      cachedRows = new Map();
      this.cache.set(tableId, cachedRows);
    }

    for (const row of rows) {
      cachedRows.set(row.id, row);
    }
  }

  async load(tableId: CmsTableId, rowIds: Iterable<CmsRowId>): Promise<void> {
    let cachedRows = this.cache.get(tableId);
    if (!cachedRows) {
      cachedRows = new Map();
      this.cache.set(tableId, cachedRows);
    }

    const uncachedRowIds = xDifference(rowIds, cachedRows.keys());

    if (uncachedRowIds.size > 0) {
      const newRows = await this.dbMgr.queryCmsRows(
        tableId,
        { where: { _id: { $in: Array.from(uncachedRowIds) } } },
        this.queryOpts
      );

      this.fill(tableId, newRows);
    }
  }

  getCached(tableId: CmsTableId, rowId: CmsRowId): CmsRow | undefined {
    return this.cache.get(tableId)?.get(rowId);
  }
}
