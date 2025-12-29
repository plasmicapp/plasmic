import {
  JSON_LOGIC_REVERSE_OPERATORS,
  toJsonLogicFormat,
} from "@/wab/server/data-sources/data-source-utils";
import { getDefaultConnection } from "@/wab/server/db/DbCon";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { OauthToken, TokenData } from "@/wab/server/entities/Entities";
import { logger } from "@/wab/server/observability";
import {
  BadRequestError,
  UnauthorizedError,
} from "@/wab/shared/ApiErrors/errors";
import { assert, ensure } from "@/wab/shared/common";
import {
  AirtableDataSource,
  FAKE_AIRTABLE_FIELD,
} from "@/wab/shared/data-sources-meta/airtable-meta";
import { DATA_SOURCE_QUERY_BUILDER_CONFIG } from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  Filters,
  FiltersLogic,
  LabeledValue,
  RawPagination,
  buildQueryBuilderConfig,
  fillPagination,
} from "@/wab/shared/data-sources-meta/data-sources";
import { CrudSorting } from "@pankod/refine-core";
import {
  DataSourceSchema,
  ManyRowsResult,
  Pagination,
  SingleRowResult,
  TableFieldSchema,
  TableSchema,
} from "@plasmicapp/data-sources";
import { Formula, compile } from "@qualifyze/airtable-formulator";
import Airtable from "airtable";
import { AirtableBase } from "airtable/lib/airtable_base";
import { isNumber, omit } from "lodash";
import moize from "moize";
import refresh from "passport-oauth2-refresh";
import { Connection } from "typeorm";

const JSON_LOGIC_TO_AIRTABLE_OPERATORS = {
  "===": "=",
  "==": "=",
  "!==": "!=",
  "!=": "!=",
  ">": ">",
  ">=": ">=",
  "<": "<",
  "<=": "<=",
  in: "contains",
} as const;

export function makeAirtableFetcher(
  dbCon: Connection,
  source: AirtableDataSource
) {
  return new AirtableFetcher(
    dbCon,
    ensure(source.credentials.credentials, `Must specify credentials`),
    source.settings.baseId
  );
}

const fetchSchema = moize(
  async (baseId: string, accessToken: string) => {
    const res = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (res.status === 401) {
      const data = await res.json();
      throw new UnauthorizedError(data.error.message);
    }
    return { statusCode: res.status, data: await res.json() };
  },
  {
    isPromise: true,
    maxAge: 10 * 1000, // 10 seconds cache
    maxArgs: 1,
  }
);

function logicToFormula(logic: FiltersLogic, dateFields: Set<string>): Formula {
  const processField = (field: any): Formula =>
    field === FAKE_AIRTABLE_FIELD ? ["RECORD_ID"] : { field };
  const processFieldValue = (fieldValue: { field: any; value: any }) => {
    const value = fieldValue.value === null ? ["BLANK"] : fieldValue.value;
    return dateFields.has(fieldValue.field) ? ["DATETIME_PARSE", value] : value;
  };
  if ("and" in logic) {
    return ["AND", ...logic.and.map((x: any) => logicToFormula(x, dateFields))];
  } else if ("or" in logic) {
    return ["OR", ...logic.or.map((x: any) => logicToFormula(x, dateFields))];
  } else if ("!" in logic) {
    return ["NOT", logicToFormula(logic["!"], dateFields)];
  } else if ("!!" in logic) {
    return ["NOT", ["NOT", logicToFormula(logic["!!"], dateFields)]];
  } else if ("in" in logic) {
    const value = processFieldValue({
      field: logic.in[1]["var"],
      value: logic.in[0],
    });
    const field = processField(logic.in[1]["var"]);
    return ["!=", ["SEARCH", ["LOWER", value], ["LOWER", field]], ""];
  } else if ("var" in logic) {
    return { field: logic.var as string };
  } else {
    const operator = Object.keys(logic)[0];
    if (logic[operator].length === 3) {
      const reverseOperator = ensure(
        JSON_LOGIC_REVERSE_OPERATORS[operator],
        () => `No reverse logic for operator ${operator}`
      );
      const value1 = processFieldValue({
        field: logic[operator][1].var,
        value: logic[operator][0],
      });
      const value2 = processFieldValue({
        field: logic[operator][1].var,
        value: logic[operator][2],
      });
      const field = processField(logic[operator][1].var);
      return [
        "AND",
        [
          ensure(
            JSON_LOGIC_TO_AIRTABLE_OPERATORS[operator],
            () => `No airtable operator for operator: ${operator}`
          ),
          field,
          value2,
        ],
        [
          ensure(
            JSON_LOGIC_TO_AIRTABLE_OPERATORS[reverseOperator],
            () => `No airtable operator for operator: ${reverseOperator}`
          ),
          field,
          value1,
        ],
      ];
    } else {
      const value = processFieldValue({
        field: logic[operator][0].var,
        value: logic[operator][1],
      });
      const field = processField(logic[operator][0].var);
      return [
        ensure(
          JSON_LOGIC_TO_AIRTABLE_OPERATORS[operator],
          () => `No airtable operator for operator: ${operator}`
        ),
        field,
        value,
      ];
    }
  }
}

function filtersToAirtableFormula(filters?: Filters) {
  let logic: FiltersLogic | undefined = undefined;
  const fields = filters?.fields;
  if (filters) {
    const builderConfig = buildQueryBuilderConfig(
      DATA_SOURCE_QUERY_BUILDER_CONFIG.airtable,
      filters.fields
    );
    logic = filters.tree
      ? toJsonLogicFormat(filters.tree, builderConfig)
      : filters.logic;
  }
  if (!logic || !fields) {
    return undefined;
  }
  const formula = logicToFormula(
    logic,
    new Set(
      Object.keys(fields).filter((field) => {
        return fields[field].type === "date";
      })
    )
  );

  return compile(formula);
}

export class AirtableFetcher {
  private client: AirtableBase;
  private tokenData: TokenData;
  constructor(
    private dbCon: Connection,
    private credentials: string,
    private baseId: string
  ) {}

  async getSchema(): Promise<DataSourceSchema> {
    await this.getAndCacheCredentials();
    return this.tryAndRefresh(async () => {
      const { data, statusCode } = await fetchSchema(
        this.baseId,
        this.tokenData.accessToken
      );
      if (data.error) {
        const error = new Error(data.error.message);
        (error as any).statusCode = statusCode;
        throw error;
      }
      if (data.errors) {
        const error = new Error(
          data.errors.map((err) => err.message).join(",")
        );
        (error as any).statusCode = statusCode;
        throw error;
      }
      const dataSourceSchema: DataSourceSchema = {
        tables: (data.tables as any[]).map<TableSchema>((table) => ({
          id: table.id,
          label: table.name,
          fields: [
            {
              // Airtable allows users to create fields named "ID" and to have
              // primary keys, but requires users to use the internal IDs for
              // fetching specific rows, updating, etc. So, to avoid naming
              // collisions, we call Airtable's internal ID fields FAKE_AIRTABLE_FIELD
              id: FAKE_AIRTABLE_FIELD,
              label: "Airtable ID",
              readOnly: true,
              type: "string",
              primaryKey: true,
            },
            ...(table.fields as any[]).map(
              (field): TableFieldSchema => ({
                id: field.name,
                label: field.name,
                type: AIRTABLE_TYPE_TO_BUILDER_TYPE[field.type] ?? "unknown",
                readOnly: AIRTABLE_READONLY_TYPES.includes(field.type),
              })
            ),
          ],
        })),
      };
      return dataSourceSchema;
    });
  }

  async getResourceSchema(resource: string) {
    const schema = await this.getSchema();
    const tableSchema = schema.tables.find((t) => t.id === resource);
    if (!tableSchema) {
      throw new BadRequestError(`Couldn't find table ${tableSchema}`);
    }
    return tableSchema;
  }

  async getTableSchema({ resource }) {
    if (!resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    await this.getAndCacheCredentials();
    return this.tryAndRefresh(async () => {
      return this.processResult(resource, {
        data: [],
      });
    });
  }

  async getMany({ resource, ids }: { resource: string; ids: string[] }) {
    if (!resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    await this.getAndCacheCredentials();
    return this.tryAndRefresh(async () => {
      const data = await this.client(resource)
        .select({
          pageSize: 100,
          // https://community.airtable.com/t5/development-apis/most-efficient-way-to-retrieve-specific-records-by-id/td-p/46532
          filterByFormula: `SEARCH(RECORD_ID(), "${ids.join(",")}") != ""`,
        })
        .all();
      return this.processResult(resource, {
        data: data.map((p) => ({
          ...p.fields,
          [FAKE_AIRTABLE_FIELD]: p.id,
        })),
      });
    });
  }

  async getList(opts: {
    resource: string;
    pagination?: Pagination;
    sort?: CrudSorting;
    filters?: Filters;
  }) {
    if (!opts.resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    await this.getAndCacheCredentials();

    return this.tryAndRefresh(async () => {
      const { pageIndex, pageSize } =
        opts.pagination ?? ({} as Partial<Pagination>);

      const queryFilters = filtersToAirtableFormula(opts.filters);
      const data = await this.client(opts.resource)
        .select({
          pageSize: 100,
          ...(isNumber(pageIndex) && isNumber(pageSize)
            ? { offset: pageIndex * pageSize }
            : {}),
          ...(isNumber(pageSize) ? { maxRecords: pageSize } : {}),
          ...(opts.sort
            ? {
                sort: opts.sort?.map(({ field, order }) => ({
                  field,
                  direction: order,
                })),
              }
            : {}),
          ...(queryFilters ? { filterByFormula: queryFilters } : {}),
        })
        .all();

      return this.processResult(
        opts.resource,
        {
          data: data.map((p) => ({
            ...p.fields,
            [FAKE_AIRTABLE_FIELD]: p.id,
          })),
        },
        { paginate: opts.pagination }
      );
    });
  }

  async getOne(opts: { resource: string; id: string }) {
    if (!opts.resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    await this.getAndCacheCredentials();
    if (!opts.id) {
      throw new BadRequestError(`Missing Airtable Record ID`);
    }
    return this.tryAndRefresh(async () => {
      const { fields } = await this.client(opts.resource).find(
        opts.id.toString()
      );
      return this.processResult(opts.resource, {
        data: {
          ...fields,
          [FAKE_AIRTABLE_FIELD]: opts.id,
        },
      });
    });
  }

  async create(opts: { resource: string; variables: Record<string, any> }) {
    if (!opts.resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    await this.getAndCacheCredentials();
    return this.tryAndRefresh(async () => {
      const { id, fields } = await this.client(opts.resource).create(
        opts.variables ?? {}
      );

      return this.processResult(opts.resource, {
        data: {
          ...fields,
          [FAKE_AIRTABLE_FIELD]: id,
        },
      });
    });
  }

  async createMany(opts: {
    resource: string;
    variables: Record<string, any>[];
  }) {
    if (!opts.resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    await this.getAndCacheCredentials();
    return this.tryAndRefresh(async () => {
      const data = await this.client(opts.resource).create(
        opts.variables.map((val) => ({ fields: val }))
      );
      return this.processResult(opts.resource, {
        data: data.map((p) => ({
          ...p.fields,
          [FAKE_AIRTABLE_FIELD]: p.id,
        })),
      });
    });
  }

  async update(opts: { resource: string; variables: Record<string, any> }) {
    if (!opts.resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    await this.getAndCacheCredentials();
    if (!opts.variables[FAKE_AIRTABLE_FIELD]) {
      throw new BadRequestError(`Missing Airtable Record ID to update`);
    }
    return this.tryAndRefresh(async () => {
      const { fields, id } = await this.client(opts.resource).update(
        `${opts.variables[FAKE_AIRTABLE_FIELD]}`,
        omit(opts.variables, FAKE_AIRTABLE_FIELD)
      );

      return this.processResult(opts.resource, {
        data: {
          ...fields,
          [FAKE_AIRTABLE_FIELD]: id,
        },
      });
    });
  }

  async updateById(opts: {
    resource: string;
    id: string;
    variables: Record<string, any>;
  }) {
    return this.update({
      resource: opts.resource,
      variables: { ...opts.variables, [FAKE_AIRTABLE_FIELD]: opts.id },
    });
  }

  async updateMany(opts: {
    resource: string;
    variables: Record<string, any>[];
  }) {
    if (!opts.resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    await this.getAndCacheCredentials();
    return this.tryAndRefresh(async () => {
      const data = await this.client(opts.resource).update(
        opts.variables.map((v) => ({
          id: v[FAKE_AIRTABLE_FIELD],
          fields: omit(v, FAKE_AIRTABLE_FIELD),
        }))
      );
      return this.processResult(opts.resource, {
        data: data.map((p) => ({
          ...p.fields,
          [FAKE_AIRTABLE_FIELD]: p.id,
        })),
      });
    });
  }

  async deleteOne(opts: { resource: string; id: string }) {
    if (!opts.resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    await this.getAndCacheCredentials();
    if (!opts.id) {
      throw new BadRequestError(`Missing Airtable Record ID to delete`);
    }
    return this.tryAndRefresh(async () => {
      const { fields } = await this.client(opts.resource).destroy(
        opts.id.toString()
      );
      return this.processResult(opts.resource, {
        data: {
          ...fields,
          [FAKE_AIRTABLE_FIELD]: opts.id,
        },
      });
    });
  }

  async deleteMany(opts: { resource: string; ids: string[] }) {
    if (!opts.resource) {
      throw new BadRequestError(`Must specify table name`);
    }
    await this.getAndCacheCredentials();
    return this.tryAndRefresh(async () => {
      const data = await this.client(opts.resource).destroy(
        opts.ids.map(String)
      );

      return this.processResult(opts.resource, {
        data: data.map((p) => ({
          ...p.fields,
          [FAKE_AIRTABLE_FIELD]: p.id,
        })),
      });
    });
  }

  private async getAndCacheCredentials() {
    if (!!this.client && this.tokenData) {
      return;
    }
    const maybeTokenData = await this.dbCon.transaction((em) => {
      const dbMgr = new DbMgr(em, SUPER_USER);
      return dbMgr.getOauthTokenById(this.credentials);
    });
    assert(maybeTokenData, "OAuth token should not be undefined");
    this.tokenData = maybeTokenData.token;
    this.client = new Airtable({
      apiKey: this.tokenData.accessToken,
      noRetryIfRateLimited: true,
    }).base(this.baseId);
  }

  private async tryAndRefresh(req: () => Promise<any>) {
    return tryAndRefresh(req, this.credentials, this.tokenData, (newTokens) => {
      this.tokenData = newTokens;
      this.client = new Airtable({
        apiKey: this.tokenData.accessToken,
        noRetryIfRateLimited: true,
      }).base(this.baseId);
    });
  }

  private async processResult(
    resource: string,
    result: Omit<SingleRowResult, "schema"> | Omit<ManyRowsResult, "schema">,
    opts?: { paginate?: RawPagination }
  ): Promise<SingleRowResult | ManyRowsResult> {
    if (opts?.paginate) {
      (result as ManyRowsResult).paginate = fillPagination(opts.paginate);
    }
    return Object.assign(result, {
      schema: await this.getResourceSchema(resource),
    });
  }
}

const AIRTABLE_READONLY_TYPES = ["createdTime"] as const;

const AIRTABLE_TYPE_TO_BUILDER_TYPE = {
  singleLineText: "string",
  multilineText: "string",
  email: "string",
  url: "string",
  percent: "number",
  currency: "string",
  number: "number",
  autoNumber: "number",
  count: "number",
  duration: "number",
  createdTime: "datetime",
  dateTime: "datetime",
  date: "date",
  checkbox: "boolean",
  singleSelect: "string",
  multipleRecordLinks: "string",
  multipleLookupValues: "string",
  rollup: "string",
} as const;

export async function fetchBases(
  oauthToken: OauthToken
): Promise<LabeledValue[]> {
  let tokens = oauthToken.token;
  const req = async () => {
    const res = await fetch(`https://api.airtable.com/v0/meta/bases/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    const data = await res.json();
    if (res.status === 401) {
      throw new UnauthorizedError(data.error.message);
    }
    if (data.error) {
      const error = new Error(data.error.message);
      (error as any).statusCode = res.status;
    }
    return data.bases.map(
      (base) =>
        ({
          value: base.id,
          label: base.name,
        } as LabeledValue)
    );
  };
  return tryAndRefresh(req, oauthToken.id, oauthToken.token, (newTokens) => {
    tokens = newTokens;
  });
}

async function tryAndRefresh(
  req: () => Promise<any>,
  oauthTokenId: string,
  token: TokenData,
  resolve?: (newTokens: TokenData) => void
) {
  try {
    const data = await req();
    return data;
  } catch (e) {
    if (!e.statusCode || e.statusCode !== 401) {
      throw e;
    }
    const newTokens = await refreshAndUpdateToken(oauthTokenId, token);
    if (!newTokens) {
      throw e;
    }
    resolve?.(newTokens);
    return req();
  }
}

async function refreshAndUpdateToken(oauthTokenId: string, token: TokenData) {
  const conn = await getDefaultConnection();
  return conn.transaction(async (em) => {
    const mgr = new DbMgr(em, SUPER_USER);
    await mgr.waitLockTransactionResource(oauthTokenId);
    const currentToken = ensure(
      await mgr.getOauthTokenById(oauthTokenId),
      "OauthToken must exist"
    );
    if (
      currentToken.token.accessToken !== token.accessToken ||
      currentToken.token.refreshToken !== token.refreshToken
    ) {
      return currentToken.token;
    }
    return new Promise<TokenData | undefined>((resolve) =>
      refresh.requestNewAccessToken(
        "airtable",
        token.refreshToken,
        async (err, accessToken, refreshToken) => {
          if (err) {
            logger().error("ERROR", err);
            resolve(undefined);
            return;
          }

          await mgr.refreshOauthTokenById(oauthTokenId, {
            accessToken,
            refreshToken,
          });
          await resolve({ accessToken, refreshToken });
        }
      )
    );
  });
}
