import { toJsonLogicFormat } from "@/wab/server/data-sources/data-source-utils";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import {
  DataSourceError,
  fillPagination,
  Filters,
  FiltersLogic,
  RawPagination,
} from "@/wab/shared/data-sources-meta/data-sources";
import {
  FakeDataSource,
  fakeSchema,
  getFakeDatabase,
} from "@/wab/shared/data-sources-meta/fake-meta";
import { evalExprInSandbox } from "@/wab/shared/eval";
import {
  DataSourceSchema,
  ManyRowsResult,
  SingleRowResult,
  TableFieldSchema,
  TableSchema,
} from "@plasmicapp/data-sources";
import { AntdConfig } from "@react-awesome-query-builder/antd";
import { cloneDeep, isString } from "lodash";

export function makeFakeFetcher(source: FakeDataSource) {
  return new FakeFetcher(source);
}

function filterRow(row: Record<string, any>, filters?: Filters): boolean {
  if (!filters) {
    return true;
  }
  const filtersLogic = filters.tree
    ? toJsonLogicFormat(filters.tree, { ...AntdConfig, fields: filters.fields })
    : filters.logic;
  if (!filtersLogic) {
    return true;
  }
  function evaluateLogic(logic: FiltersLogic): boolean {
    if ("and" in logic) {
      return logic.and.every((x: any) => evaluateLogic(x));
    } else if ("or" in logic) {
      return logic.or.some((x: any) => evaluateLogic(x));
    } else if ("!" in logic) {
      return !evaluateLogic(logic["!"]);
    } else if ("!!" in logic) {
      return !!evaluateLogic(logic["!!"] as FiltersLogic);
    } else if ("in" in logic) {
      const fieldName = logic.in[1]?.["var"];
      const value = logic.in[0];
      if (!isString(value) || !isString(row[fieldName])) {
        return false;
      }
      return row[fieldName].toLowerCase().includes(value.toLowerCase());
    } else if ("var" in logic) {
      return !!row[logic.var as string];
    } else {
      const operator = Object.keys(logic)[0];
      if (logic[operator].length === 3) {
        const fieldName = logic[operator][1]["var"];
        const value1 = JSON.stringify(logic[operator][0]);
        const value2 = JSON.stringify(logic[operator][2]);
        const columnValue = JSON.stringify(row[fieldName]);
        return evalExprInSandbox(
          `${value1} ${operator} ${columnValue} && ${columnValue} ${operator} ${value2}`,
          {}
        );
      } else {
        const fieldName = logic[operator][0]["var"];
        const value = JSON.stringify(logic[operator][1]);
        const columnValue = JSON.stringify(row[fieldName]);
        return evalExprInSandbox(`${columnValue} ${operator} ${value}`, {});
      }
    }
  }
  return evaluateLogic(filtersLogic);
}

export class FakeFetcher {
  private database: Record<string, any>;
  constructor(private source: FakeDataSource) {
    this.database = getFakeDatabase(source.id);
  }

  getSchema(): DataSourceSchema {
    return {
      tables: Object.entries(fakeSchema).map(
        ([tableId, tableFields]): TableSchema => ({
          id: tableId,
          fields: tableFields.map(
            (field): TableFieldSchema => ({
              id: field.name,
              label: field.name,
              type: field.type,
              readOnly: false,
              primaryKey: field.primaryKey,
            })
          ),
        })
      ),
    };
  }

  private getResourceSchema(resource: string) {
    if (!resource) {
      throw new DataSourceError(`Must specify table name`);
    }
    const dbSchema = this.getSchema();
    const tableSchema = dbSchema.tables.find((table) => table.id === resource);
    if (!tableSchema) {
      throw new DataSourceError(`Table "${resource}" doesn't exist`);
    }
    return tableSchema;
  }

  private processResult(
    resource: string,
    result: Omit<SingleRowResult, "schema"> | Omit<ManyRowsResult, "schema">,
    opts?: { paginate?: RawPagination }
  ): SingleRowResult | ManyRowsResult {
    if (opts?.paginate) {
      (result as ManyRowsResult).paginate = fillPagination(opts.paginate);
    }
    return Object.assign(cloneDeep(result), {
      schema: this.getResourceSchema(resource),
    });
  }

  getTableSchema({ resource }: { resource: string }) {
    if (!resource) {
      throw new DataSourceError(`Must specify table name`);
    }
    return {
      data: [],
      schema: this.getResourceSchema(resource),
    };
  }

  getList(opts: { resource: string; filters?: Filters }) {
    const { resource, filters } = opts;
    if (!resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    return this.processResult(resource, {
      data: this.database[resource].filter((row) => filterRow(row, filters)),
    });
  }

  create(opts: { resource: string; variables: Record<string, any> }) {
    const { resource, variables } = opts;
    if (!resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    this.database[resource].push({ ...variables });
    return 1;
  }

  createMany(opts: { resource: string; variables: Record<string, any>[] }) {
    const { resource, variables } = opts;
    if (!resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    this.database[resource].concat(variables);
    return variables.length;
  }

  updateById(opts: {
    resource: string;
    keys?: Record<string, any>;
    variables: Record<string, any>;
  }) {
    const { resource, variables, keys } = opts;
    if (!resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    if (!variables) {
      throw new BadRequestError(`Missing required parameter: Filters`);
    }
    const tableData = this.database[resource];
    const tableSchema = this.database[resource];
    if (!tableData || !tableSchema) {
      throw new DataSourceError(`Table "${resource}" doesn't exist`);
    }
    const primaryKeys = tableSchema.fields.filter((field) => field.primaryKey);
    if (primaryKeys.length === 0) {
      throw new DataSourceError(
        `Invalid Table. "${opts.resource}" doesn't have any primary key`
      );
    }
    const missingPrimaryKeys = primaryKeys.filter(
      (primaryKey) => keys?.[primaryKey.id] == null
    );
    if (missingPrimaryKeys.length > 0 || !keys) {
      throw new DataSourceError(
        `Missing the following primary keys: ${missingPrimaryKeys
          .map((primaryKey) => primaryKey.label ?? primaryKey.id)
          .join(",")}`
      );
    }
    let rowCount = 0;
    for (const row of tableData) {
      if (Object.entries(row).some(([field, value]) => keys[field] !== value)) {
        continue;
      }
      Object.assign(row, variables);
      rowCount++;
    }
    return rowCount;
  }

  updateMany(opts: {
    resource: string;
    variables: Record<string, any>;
    conditions: Filters;
  }) {
    const { resource, variables, conditions } = opts;
    if (!resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    if (!variables) {
      throw new BadRequestError(`Missing required parameter: Filters`);
    }
    const tableData = this.database[resource];
    if (!tableData) {
      throw new DataSourceError(`Table "${resource}" doesn't exist`);
    }
    let rowCount = 0;
    for (const row of tableData) {
      if (!filterRow(row, conditions)) {
        continue;
      }
      Object.assign(row, variables);
      rowCount++;
    }
    return rowCount;
  }

  deleteMany(opts: { resource: string; conditions?: Filters }) {
    const { resource, conditions } = opts;
    if (!resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    if (!conditions) {
      throw new BadRequestError(`Missing required parameter: Filters`);
    }
    if (!(resource in this.database)) {
      throw new DataSourceError(`Table "${resource}" doesn't exist`);
    }
    const rowCount = this.database[resource].length;
    this.database[resource] = this.database[resource].filter(
      (row) => !filterRow(row, conditions)
    );
    return rowCount - this.database[resource].length;
  }
}
