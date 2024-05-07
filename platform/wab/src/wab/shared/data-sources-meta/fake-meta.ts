import { ensure } from "@/wab/common";
import {
  DataSourceMeta,
  FilterArgMeta,
  JsonSchemaArgMeta,
  JsonSchemaArrayArgMeta,
  MAKE_DEFAULT_STANDARD_QUERIES,
  TableArgMeta,
} from "@/wab/shared/data-sources-meta/data-sources";
import { QueryBuilderPostgresConfig } from "@/wab/shared/data-sources-meta/postgres-meta";
import { capitalizeFirst } from "@/wab/strs";
import { DataSourceSchema, TableFieldType } from "@plasmicapp/data-sources";
import { cloneDeep } from "lodash";

export const fakeSchema: Record<
  string,
  { name: string; type: TableFieldType; primaryKey?: boolean }[]
> = {
  athletes: [
    { name: "id", type: "number", primaryKey: true },
    { name: "firstName", type: "string" },
    { name: "lastName", type: "string" },
    { name: "sport", type: "string" },
    { name: "age", type: "number" },
  ],
  products: [
    { name: "id", type: "number", primaryKey: true },
    { name: "name", type: "string" },
    { name: "price", type: "number" },
  ],
};

const fakeInitDatabase = {
  athletes: [
    {
      id: 1,
      firstName: "Roger",
      lastName: "Federer",
      sport: "Tennis",
      age: 38,
    },
    {
      id: 2,
      firstName: "Neymar",
      lastName: "Silva",
      sport: "Futebol",
      age: 31,
    },
    {
      id: 3,
      firstName: "Serena",
      lastName: "Williams",
      sport: "Tennis",
      age: 35,
    },
    {
      id: 4,
      firstName: "Stephen",
      lastName: "Curry",
      sport: "Basketball",
      age: 32,
    },
  ],
  products: [
    {
      id: 1,
      name: "Milk",
      price: 2,
    },
    {
      id: 2,
      name: "Eggs",
      price: 0.5,
    },
    {
      id: 3,
      name: "Chicken",
      price: 7,
    },
  ],
};

/**
 * The fake database is keyed by the sourceId
 * (every project creates a new integration with a different sourceId)
 *
 * This helps prevent problems with parallelism. Since this fake integration is
 * just an array in memory, multiple projects accessing and modifying the same array
 * could cause flaky errors in tests
 **/
export const fakeDatabase = new Map<string, typeof fakeInitDatabase>();

export const dropFakeDatabase = (sourceId: string) => {
  fakeDatabase.delete(sourceId);
};

export const getFakeDatabase = (sourceId: string) => {
  if (!fakeDatabase.has(sourceId)) {
    fakeDatabase.set(sourceId, cloneDeep(fakeInitDatabase));
  }
  return ensure(fakeDatabase.get(sourceId), "checked before");
};

const makeFields = (schemaData: DataSourceSchema, tableId?: string) => {
  if (!tableId) {
    return {};
  }
  const table = schemaData.tables.find((t) => t.id === tableId);
  if (!table) {
    return {};
  }
  return Object.fromEntries(
    table.fields
      .filter((field) => field.type !== "unknown")
      .sort((a, b) => {
        // Sort fields without labels last
        if (a.label === undefined) {
          return 1;
        } else if (b.label === undefined) {
          return -1;
        } else {
          return a.label.localeCompare(b.label);
        }
      })
      .map((field) => [
        field.id,
        {
          type: field.type,
          label: field.label ?? capitalizeFirst(field.id),
        },
      ])
  );
};

const TABLE_TYPE: TableArgMeta = {
  type: "table",
  label: "Table",
  options: (data: DataSourceSchema) => {
    if (!data) {
      return [];
    }
    return data.tables.map((table) => ({
      label: table.label ?? table.id,
      value: table.id,
    }));
  },
  required: true,
};

const FILTER_TYPE: FilterArgMeta = {
  type: "filter[]",
  label: "Filters",
  fields: makeFields,
};

const CREATE_TYPE: JsonSchemaArgMeta = {
  type: "json-schema",
  label: "Fields",
  fields: makeFields,
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
};

const CREATE_MANY_TYPE: JsonSchemaArrayArgMeta = {
  type: "json-schema[]",
  label: "Fields",
  fields: makeFields,
  required: true,
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
};

const UPDATE_TYPE: JsonSchemaArgMeta = {
  type: "json-schema",
  label: "Field updates",
  fields: makeFields,
  partial: true,
  required: true,
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
};

const PRIMARY_KEY_TYPE: JsonSchemaArgMeta = {
  type: "json-schema",
  label: "Primary key",
  hideInputToggle: true,
  layout: "vertical",
  showAsIndentedRow: true,
  requiredFields: (schema, tableIdentifier) => {
    if (!schema) {
      return [];
    }
    const table = schema.tables.find((t) => t.id === tableIdentifier);
    if (!table) {
      return [];
    }
    return table.fields
      .filter((field) => field.primaryKey)
      .map((field) => field.id);
  },
  fields: (schema, tableIdentifier) => {
    if (!schema) {
      return {};
    }
    const table = schema.tables.find((t) => t.id === tableIdentifier);
    if (!table) {
      return {};
    }
    return Object.fromEntries(
      table.fields
        .filter((field) => field.primaryKey)
        .map((field) => [
          field.id,
          {
            type: field.type,
            label: field.label ?? capitalizeFirst(field.id),
          },
        ])
    );
  },
  hidden: (schema, tableIdentifier) => !schema || !tableIdentifier,
};

export interface FakeDataSource extends DataSourceMeta {
  source: "fake";
}

export const FAKE_META: DataSourceMeta = {
  id: "fake",
  label: "Fake",
  credentials: {},
  settings: {},
  studioOps: {
    schemaOp: {
      name: "getSchema",
      type: "read",
      args: {},
    },
  },
  ops: [
    {
      name: "getTableSchema",
      label: "Query for Schema",
      type: "read",
      args: { resource: TABLE_TYPE },
      hidden: true,
    },
    {
      name: "getList",
      label: "Query for rows",
      type: "read",
      args: {
        resource: TABLE_TYPE,
        filters: FILTER_TYPE,
      },
    },
    {
      name: "create",
      label: "Create row",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        variables: CREATE_TYPE,
      },
    },
    {
      name: "createMany",
      label: "Create rows",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        variables: CREATE_MANY_TYPE,
      },
    },
    {
      name: "updateById",
      label: "Update row by primary key",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        keys: PRIMARY_KEY_TYPE,
        variables: UPDATE_TYPE,
      },
    },
    {
      name: "updateMany",
      label: "Update rows",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        conditions: { ...FILTER_TYPE, required: true },
        variables: UPDATE_TYPE,
      },
    },
    {
      name: "deleteMany",
      label: "Delete rows",
      type: "write",
      args: {
        resource: TABLE_TYPE,
        conditions: { ...FILTER_TYPE, required: true },
      },
    },
  ],
  standardQueries: {
    getList: MAKE_DEFAULT_STANDARD_QUERIES.getList("getList"),
    getSchema: MAKE_DEFAULT_STANDARD_QUERIES.getSchema("getTableSchema"),
    getOne: MAKE_DEFAULT_STANDARD_QUERIES.getOne("getList"),
    create: MAKE_DEFAULT_STANDARD_QUERIES.create("create"),
    update: MAKE_DEFAULT_STANDARD_QUERIES.update("updateMany"),
  },
};

export const QueryBuilderFakeConfig = QueryBuilderPostgresConfig;
