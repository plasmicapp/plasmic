import {
  CustomCode,
  DataSourceOpExpr,
  DataSourceTemplate,
  Expr,
  isKnownTemplatedString,
  ObjectPath,
  QueryInvalidationExpr,
  TemplatedString,
} from "@/wab/classes";
import { assert, ensure, ensureString, mkUuid } from "@/wab/common";
import {
  asCode,
  clone,
  ExprCtx,
  stripParensAndMaybeConvertToIife,
} from "@/wab/exprs";
import { ApiDataSource } from "@/wab/shared/ApiSchema";
import type { DataSourceType } from "@/wab/shared/data-sources-meta/data-source-registry";
import { substitutePlaceholder } from "@/wab/shared/dynamic-bindings";
import {
  DataSourceSchema,
  Pagination,
  TableSchema,
} from "@plasmicapp/data-sources";
import { AntdConfig, Field, JsonTree } from "@react-awesome-query-builder/antd";
import type {
  JsonLogicAnd,
  JsonLogicDoubleNegation,
  JsonLogicGreaterThan,
  JsonLogicGreaterThanOrEqual,
  JsonLogicInArray,
  JsonLogicInString,
  JsonLogicLessThan,
  JsonLogicLessThanOrEqual,
  JsonLogicNegation,
  JsonLogicOr,
  JsonLogicStrictEqual,
  JsonLogicStrictNotEqual,
  JsonLogicVar,
} from "json-logic-js";
import { isString, mapValues, merge } from "lodash";
import { z } from "zod";

export const ALL_QUERIES = { value: "plasmic_refresh_all", label: "All" };
export const SHOW_INVALIDATION_KEYS = {
  value: "plasmic_show_invalidation_keys",
  label: "Specific query groups",
};

export class DataSourceError extends Error {
  details?: any;
  statusCode?: number;
  constructor(details?: any, statusCode?: number) {
    super(isString(details) ? details : undefined);
    if (!isString(details)) {
      this.details = details;
    }
    this.statusCode = statusCode;
  }
}

export interface DataSourceMeta {
  id: string;
  label: string;
  credentials: Record<string, SettingFieldMeta>;
  settings: Record<string, SettingFieldMeta>;
  fieldOrder?: string[];
  studioOps: StudioOperations;
  ops: OperationMeta[];
  standardQueries?: {
    getSchema?: (sourceId: string, tableId: string) => DataSourceOpExpr;
    getList?: (sourceId: string, tableId: string) => DataSourceOpExpr;
    getOne?: (
      sourceId: string,
      tableSchema: TableSchema,
      filters: {
        value: Record<string, any>;
        bindings: Record<string, TemplatedString | CustomCode | ObjectPath>;
      }
    ) => DataSourceOpExpr;
    update?: (
      sourceId: string,
      tableSchema: TableSchema,
      filters: {
        value: Record<string, any>;
        bindings: Record<string, TemplatedString | CustomCode | ObjectPath>;
      },
      updateValue: {
        value: Record<string, any> | string;
        bindings: Record<string, TemplatedString | CustomCode | ObjectPath>;
      }
    ) => DataSourceOpExpr;
    create?: (
      sourceId: string,
      tableSchema: TableSchema,
      updateValue: {
        value: Record<string, any> | string;
        bindings: Record<string, TemplatedString | CustomCode | ObjectPath>;
      }
    ) => DataSourceOpExpr;
  };
}

export type RawType =
  | "string"
  | "number"
  | "boolean"
  | "string[]"
  | "sort[]"
  | "filter[]"
  | "pagination"
  | "dict"
  | "dict[]"
  | "table"
  | "enum"
  | "oauth2"
  | "base"
  | "plasmic-cms-id"
  | "plasmic-cms-token"
  | "json-schema"
  | "json-schema[]"
  | "dict-string"
  | "graphql-query"
  | "http-body";

export type Fields = {
  [key: string]: Field;
};

export type LabeledValue = {
  value: string;
  label: string;
};

export type LabeledValueGroup = {
  label: string;
  values: LabeledValue[];
};

export function isJsonType(type: RawType) {
  return type !== "string";
}

export interface StudioOperations {
  [name: string]: OperationMeta;
}

export interface SettingFieldMeta {
  type: RawType;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  default?: any;
  hidden?: boolean;
  public?: boolean;
}

export interface BasesArgMeta extends SettingFieldMeta {
  type: "base";
  options: (data: LabeledValue[]) => LabeledValue[];
}

export interface EnumArgMeta extends SettingFieldMeta {
  type: "enum";
  options: LabeledValue[];
}

export interface ArgMetaBase {
  type: RawType;
  label?: string;
  description?: string;
  required?: boolean;
  default?: any;
  /**
   * Whether this parameter is already being compiled as a string. Only used for isSql.
   *
   * @deprecated isSql is deprecated.
   */
  isParamString?: boolean;
  /**
   * Whether to generate a SQL clause for this before calling getList().
   *
   * @deprecated Should be handled by the specific DB driver, as different DBs have different syntax.
   */
  isSql?: boolean;
  hidden?: (schema: DataSourceSchema, tableIdentifier?: string) => boolean;
  renderProps?: (dataSource: ApiDataSource) => object;
  layout?: "horizontal" | "vertical";
}

export interface TableArgMeta extends ArgMetaBase {
  type: "table";
  options: (
    schemaData: DataSourceSchema
  ) => (LabeledValue | LabeledValueGroup)[];
}

export interface FilterArgMeta extends ArgMetaBase {
  type: "filter[]";
  fields: (schema: DataSourceSchema, tableIdentifier?: string) => Fields;
  /**
   * Whether to generate a SQL clause for this before calling getList().
   *
   * @deprecated Should be handled by the specific DB driver, as different DBs have different syntax.
   */
  isSql?: boolean;
}

export interface SortArgMeta extends ArgMetaBase {
  type: "sort[]";
  fields: (schema: DataSourceSchema, tableIdentifier?: string) => Fields;
}

export type DataSourceOpDraftValue = Omit<
  Partial<DataSourceOpExpr>,
  "opId" | "templates"
> & {
  templates?: Record<
    string,
    {
      type: RawType;
      value: string | TemplatedString;
      bindings:
        | Record<string, TemplatedString | CustomCode | ObjectPath>
        | undefined
        | null;
    }
  >;
  opMeta?: OperationMeta;
  queryName?: string;
  // Ugly. Must be a better way....
  extraState?: any;
};

export interface JsonSchemaArgMeta extends ArgMetaBase {
  type: "json-schema";
  fields: (
    schema: DataSourceSchema,
    tableIdentifier?: string,
    draft?: DataSourceOpDraftValue
  ) => Fields;
  partial?: boolean;
  requiredFields?:
    | string[]
    | ((
        schema: DataSourceSchema,
        tableIdentifier?: string,
        draft?: DataSourceOpDraftValue
      ) => string[]);
  hideInputToggle?: boolean;
  showAsIndentedRow?: boolean;
}

export interface JsonSchemaArrayArgMeta extends ArgMetaBase {
  type: "json-schema[]";
  fields: (
    schema: DataSourceSchema,
    tableIdentifier?: string,
    draft?: DataSourceOpDraftValue
  ) => Fields;
  partial?: boolean;
  requiredFields?:
    | string[]
    | ((
        schema: DataSourceSchema,
        tableIdentifier?: string,
        draft?: DataSourceOpDraftValue
      ) => string[]);
}

export type SpecializedArgMeta =
  | TableArgMeta
  | FilterArgMeta
  | SortArgMeta
  | JsonSchemaArgMeta
  | JsonSchemaArrayArgMeta;

export interface GenericArgMeta extends ArgMetaBase {
  type: Exclude<RawType, SpecializedArgMeta["type"]>;
}

export type ArgMeta = SpecializedArgMeta | GenericArgMeta;

export interface OperationMeta {
  name: string;
  label?: string;
  args: Record<string, ArgMeta>;
  type: "read" | "write";
  hidden?: boolean;
}

export interface OperationTemplate {
  name: string;
  // A pre-defined template for a data source operation. The keys of templates
  // correspond to keys of OperationMeta.args, and the values of templates
  // are either hard-coded values to use ("Lead", 100, etc) or a template string
  // with placeholders to be filled in live, like "UPDATE lead SET email={{email}}".
  templates: Record<string, any>;
  roleId?: string | null;
}

export function getTemplateFieldType(template: DataSourceTemplate) {
  return template.fieldType as RawType;
}

export function mkDataSourceTemplate({
  fieldType,
  value,
  bindings,
}: {
  fieldType: RawType;
  value: TemplatedString | string;
  bindings:
    | Record<string, TemplatedString | CustomCode | ObjectPath>
    | undefined
    | null;
}) {
  return new DataSourceTemplate({
    fieldType,
    value,
    bindings,
  });
}

export function cloneDataSourceTemplate({
  fieldType,
  value,
  bindings,
}: DataSourceTemplate) {
  return new DataSourceTemplate({
    fieldType,
    value: isKnownTemplatedString(value) ? clone(value) : value,
    bindings:
      bindings &&
      Object.fromEntries(
        Object.entries(bindings).map(([bindingName, bindingExpr]) => [
          bindingName,
          clone(bindingExpr),
        ])
      ),
  });
}

export function dataSourceTemplateToString(
  template: DataSourceTemplate,
  exprCtx: ExprCtx
) {
  if (isKnownTemplatedString(template.value)) {
    return exprToDataSourceString(template.value, exprCtx);
  }

  let stringValue = template.value;
  if (template.bindings) {
    Object.entries(template.bindings).forEach(([key, value]) => {
      stringValue = stringValue.replace(
        new RegExp(`${key.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1")}`, "g"),
        exprToDataSourceString(value, exprCtx)
      );
      stringValue = stringValue.replace(
        new RegExp(
          `${encodeURI(key).replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1")}`,
          "g"
        ),
        exprToDataSourceString(value, exprCtx)
      );
    });
  }
  return stringValue;
}

export function exprToDataSourceString(expr: Expr, exprCtx: ExprCtx) {
  return isKnownTemplatedString(expr)
    ? expr.text
        .map((t) =>
          isString(t)
            ? t
            : `{{ ${stripParensAndMaybeConvertToIife(asCode(t, exprCtx).code, {
                addParens: true,
              })} }}`
        )
        .join("")
    : `{{ ${stripParensAndMaybeConvertToIife(asCode(expr, exprCtx).code, {
        addParens: true,
      })} }}`;
}

export type FiltersLogic =
  | JsonLogicVar
  | JsonLogicAnd
  | JsonLogicOr
  | JsonLogicStrictEqual
  | JsonLogicStrictNotEqual
  | JsonLogicNegation
  | JsonLogicDoubleNegation
  | JsonLogicGreaterThan
  | JsonLogicGreaterThanOrEqual
  | JsonLogicLessThan
  | JsonLogicLessThanOrEqual
  | JsonLogicInString
  | JsonLogicInArray;

export type FiltersLogicExpr = boolean | string | number | FiltersLogic;

export interface Filters {
  /**
   * @deprecated Now we use `tree` instead
   */
  logic?: FiltersLogic;
  tree?: JsonTree;
  fields: any;
}

export interface ParameterizedField {
  value: string;
  parameters?: Record<string, any>;
}

export const PAGINATION_TYPE: ArgMeta = {
  type: "pagination",
  label: "Paginate",
};

export function coerceArgStringToType(
  value: string,
  argMeta: ArgMeta | SettingFieldMeta
) {
  if (isJsonType(argMeta.type)) {
    if (!value) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(value, (_, val) => substitutePlaceholder(val));
      if (argMeta.type === "pagination") {
        // Hack: Complex types with dynamic bindings only work currently with
        // templated strings.
        if (typeof parsed.pageSize === "string" && isFinite(+parsed.pageSize)) {
          parsed.pageSize = +parsed.pageSize;
        }
        if (
          typeof parsed.pageIndex === "string" &&
          isFinite(+parsed.pageIndex)
        ) {
          parsed.pageIndex = +parsed.pageIndex;
        }
      }
      return parsed;
    } catch {
      return value;
    }
  } else {
    return value ?? "";
  }
}

export function coerceArgValueToString(
  value: any,
  argMeta: ArgMeta | SettingFieldMeta
) {
  if (isJsonType(argMeta.type)) {
    return JSON.stringify(value ?? null);
  } else if (typeof value === "string") {
    return value;
  } else if (value == null) {
    return "";
  } else {
    return `${value}`;
  }
}

export function buildQueryBuilderConfig(config: any, fields: any) {
  return {
    ...merge({}, AntdConfig, config),
    fields: fields,
  };
}

export function mkDataSourceOpExpr({
  sourceId,
  opId,
  opName,
  templates,
  roleId,
  queryInvalidation,
}: {
  sourceId: string;
  opId: string;
  opName: string;
  templates?: Record<string, DataSourceTemplate>;
  roleId?: string;
  queryInvalidation?: QueryInvalidationExpr;
}) {
  return new DataSourceOpExpr({
    parent: undefined,
    sourceId: sourceId,
    opId,
    opName: opName,
    templates: templates ?? {},
    cacheKey: undefined,
    queryInvalidation,
    roleId,
  });
}

export type StandardQueries = DataSourceMeta["standardQueries"] extends infer T
  ? T extends object
    ? T
    : never
  : never;

export const MAKE_DEFAULT_STANDARD_QUERIES: {
  [k in keyof Required<StandardQueries>]: (
    opName: string
  ) => StandardQueries[k];
} = {
  getSchema: (opName) => (sourceId, tableId) =>
    new DataSourceOpExpr({
      sourceId,
      opId: "temporary-id",
      opName,
      templates: {
        resource: mkDataSourceTemplate({
          fieldType: "table",
          value: JSON.stringify(tableId),
          bindings: null,
        }),
      },
      roleId: undefined,
      cacheKey: new TemplatedString({
        text: ["getSchema"],
      }), // identify as a read op
      queryInvalidation: undefined,
      parent: undefined,
    }),
  getOne: (opName) => (sourceId, tableSchema, filters) => {
    const filterQuery = mkFilterQuery(tableSchema, filters);
    return new DataSourceOpExpr({
      sourceId,
      opId: "temporary-id",
      opName,
      templates: mapValues(
        {
          resource: mkDataSourceTemplate({
            fieldType: "table",
            value: JSON.stringify(tableSchema.id),
            bindings: null,
          }),
          filters: mkDataSourceTemplate({
            fieldType: "filter[]",
            value: JSON.stringify(filterQuery),
            bindings: filters.bindings,
          }),
        },
        (template) => cloneDataSourceTemplate(template)
      ),
      roleId: undefined,
      cacheKey: new TemplatedString({
        text: ["getOne"],
      }), // identify as a read op
      queryInvalidation: undefined,
      parent: undefined,
    });
  },
  getList: (opName) => (sourceId, tableId) =>
    new DataSourceOpExpr({
      sourceId,
      opId: "temporary-id",
      opName,
      templates: {
        resource: mkDataSourceTemplate({
          fieldType: "table",
          value: JSON.stringify(tableId),
          bindings: null,
        }),
      },
      roleId: undefined,
      cacheKey: new TemplatedString({
        text: ["getList"],
      }), // identify as a read op
      queryInvalidation: undefined,
      parent: undefined,
    }),
  update: (opName) => (sourceId, tableSchema, filters, updateValue) => {
    const filterQuery = mkFilterQuery(tableSchema, filters);
    return new DataSourceOpExpr({
      sourceId,
      opId: "temporary-id",
      opName,
      templates: mapValues(
        {
          resource: mkDataSourceTemplate({
            fieldType: "table",
            value: JSON.stringify(tableSchema.id),
            bindings: null,
          }),
          conditions: mkDataSourceTemplate({
            fieldType: "filter[]",
            value: JSON.stringify(filterQuery),
            bindings: filters.bindings,
          }),
          variables: mkDataSourceTemplate({
            bindings: updateValue.bindings,
            fieldType: "json-schema",
            value: JSON.stringify(updateValue.value),
          }),
        },
        (template) => cloneDataSourceTemplate(template)
      ),
      roleId: undefined,
      cacheKey: undefined,
      queryInvalidation: new QueryInvalidationExpr({
        invalidationQueries: [ALL_QUERIES.value],
        invalidationKeys: undefined,
      }),
      parent: undefined,
    });
  },
  create: (opName) => (sourceId, tableSchema, updateValue) => {
    return new DataSourceOpExpr({
      sourceId,
      opId: "temporary-id",
      opName,
      templates: mapValues(
        {
          resource: mkDataSourceTemplate({
            fieldType: "table",
            value: JSON.stringify(tableSchema.id),
            bindings: null,
          }),
          variables: mkDataSourceTemplate({
            bindings: updateValue.bindings,
            fieldType: "json-schema",
            value: JSON.stringify(updateValue.value),
          }),
        },
        (template) => cloneDataSourceTemplate(template)
      ),
      roleId: undefined,
      cacheKey: undefined,
      queryInvalidation: new QueryInvalidationExpr({
        invalidationQueries: [ALL_QUERIES.value],
        invalidationKeys: undefined,
      }),
      parent: undefined,
    });
  },
};

function mkFilterQuery(
  tableSchema: TableSchema,
  filters: {
    value: Record<string, any>;
    bindings: Record<string, TemplatedString | CustomCode | ObjectPath>;
  }
) {
  // building filter query
  const rules = Object.entries(filters.value).map(([field, value]) => {
    let fieldType =
      tableSchema.fields.find((f) => f.id === field)?.type ?? "text";
    if (fieldType === "string") {
      fieldType = "text";
    }
    return {
      type: "rule",
      id: mkUuid(),
      properties: {
        field,
        value: [value],
        valueSrc: ["value"],
        valueType: [`${fieldType}${fieldType !== "text" ? "-custom" : ""}`],
        operator: "equal",
      },
    };
  });
  return {
    tree: {
      type: "group",
      id: mkUuid(),
      children1: rules,
      properties: {
        conjunction: "AND",
      },
    },
    fields: Object.fromEntries(
      tableSchema.fields.map((field) => [
        field.id,
        {
          type: field.type,
          label: field.label ?? field.id,
        },
      ])
    ),
  };
}

export function ensureDataSourceStandardQuery<T extends keyof StandardQueries>(
  sourceMeta: DataSourceMeta,
  op: T
) {
  return ensure(
    sourceMeta.standardQueries?.[op],
    `Source "${sourceMeta.label}" doesn't have standard query "${op}"`
  ) as NonNullable<StandardQueries[T]>;
}

export function dataSourceHasRequiredStandardQueries(
  sourceMeta: DataSourceMeta,
  queryNames: (keyof StandardQueries)[]
) {
  if (!sourceMeta?.standardQueries) {
    return false;
  }
  return queryNames.every((q) => !!sourceMeta.standardQueries?.[q]);
}

export type LookupSpec = {
  sourceType: DataSourceType;
  sourceId: string;
  tableId: string;
  tableLabel?: string;
  lookupFields: string[];
  lookupValue?: {
    value: any;
    bindings: Record<string, ObjectPath | CustomCode | TemplatedString>;
  };
};

export type LookupSpecDraft = Partial<LookupSpec>;

export function ensureLookupSpecFromDraft(
  draft: Partial<LookupSpec> | undefined
): LookupSpec {
  assert(draft && draft.sourceType && draft.sourceId && draft.tableId, "");
  return draft as LookupSpec;
}

/**
 * TODO: Make this function more generic
 * Currently, this function only works properly with the queries created by studioQueries
 */
export function extractFiltersFromDefaultDataSourceQueries(
  dataOp: DataSourceOpExpr
) {
  const pattern = z.object({
    tree: z.object({
      type: z.literal("group"),
      properties: z.object({
        conjunction: z.literal("AND"),
      }),
      children1: z.array(
        z.object({
          type: z.literal("rule"),
          properties: z.object({
            field: z.string(),
            operator: z.literal("equal"),
            value: z.tuple([z.any()]),
            valueSrc: z.tuple([z.literal("value")]),
            valueType: z.tuple([z.string()]),
          }),
        })
      ),
    }),
    fields: z.record(
      z.object({
        type: z.string(),
        label: z.string(),
      })
    ),
  });
  const parseResult = dataOp.templates.filters
    ? pattern.safeParse(
        JSON.parse(ensureString(dataOp.templates.filters.value))
      )
    : undefined;
  return parseResult && parseResult.success
    ? Object.fromEntries(
        parseResult.data.tree.children1.map((child) => [
          child.properties.field,
          child.properties.value[0],
        ])
      )
    : undefined;
}

export type RawPagination = {
  pageSize?: unknown;
  pageIndex?: unknown;
};

/**
 * We could get any inputs as pagination, since these could be from dynamic values.
 * We coerce these into something well-defined for pagination consumers.
 */
export function fillPagination(
  pagination: RawPagination | undefined
): Pagination | undefined {
  return typeof pagination?.pageSize === "number"
    ? {
        pageSize: pagination.pageSize,
        pageIndex:
          typeof pagination.pageIndex === "number" ? pagination.pageIndex : 0,
      }
    : undefined;
}
