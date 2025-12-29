import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";
import type { RulesLogic } from "json-logic-js";
import { mkApi } from "./api";
import { DEFAULT_HOST } from "./constants";
import { ApiCmsTable } from "./schema";
import { mkFieldOptions } from "./util";
import { cmsTableToQueryBuilderConfig, rulesLogicToCmsWhere } from "./where";

function getCmsHost() {
  return (globalThis as any)["__PLASMIC_CMS_HOST__"] ?? DEFAULT_HOST;
}

interface FnContext {
  tables: ApiCmsTable[];
}

function sharedTableFnContext(
  cmsId?: string,
  cmsPublicToken?: string,
  ..._args: unknown[]
): {
  dataKey: string;
  fetcher: () => Promise<FnContext>;
} {
  if (!cmsId || !cmsPublicToken) {
    return {
      dataKey: "",
      fetcher: async () => ({ tables: [] }),
    };
  }
  return {
    dataKey: `cms_tables/${JSON.stringify({
      cmsId,
      cmsPublicToken,
    })}`,
    fetcher: async () => {
      const api = mkApi({
        databaseId: cmsId,
        databaseToken: cmsPublicToken,
        host: getCmsHost(),
      });
      const tables = await api.fetchTables();
      return { tables };
    },
  };
}

// TODO: Handle markdown in descriptions and link to https://docs.plasmic.app/learn/plasmic-cms-api-reference/#find-your-cms-ids-public-token-and-secret-token
const cmsIdParam = {
  name: "cmsId",
  type: "string",
  description: "Find the CMS ID on the Plasmic CMS settings page.",
} as const;

const cmsPublicTokenParam = {
  name: "cmsPublicToken",
  type: "string",
  description: "Find the Public Token on the Plasmic CMS settings page.",
} as const;

const tableIdParam = {
  name: "tableId",
  type: "choice",
  options: (_args: unknown, ctx: FnContext) => {
    if (!ctx?.tables) {
      return [];
    }
    return ctx.tables.map((table: { identifier: string; name: string }) => ({
      value: table.identifier,
      label: table.name,
    }));
  },
} as const;

const selectParam = {
  name: "select",
  type: "choice",
  multiSelect: true,
  description: "Fields to fetch. Defaults to all fields.",
  defaultValueHint: ["Default: *"] as string[],
  options: (args: { 2?: string | undefined }, ctx: FnContext) => {
    const tableId = args[2];
    return mkFieldOptions(ctx.tables, tableId, undefined, {
      includeRefStars: true,
    });
  },
} as const;

const whereLogicParam = {
  name: "where",
  type: "queryBuilder",
  description: "Filter fetched entries. Defaults to fetch all entries.",
  config: (args: { 2?: string | undefined }, ctx: FnContext) => {
    const tableId = args[2];
    const table = ctx.tables.find((t) => t.identifier === tableId);
    if (table) {
      return cmsTableToQueryBuilderConfig(table);
    } else {
      return { fields: {} };
    }
  },
} as const;

const orderByParam = {
  name: "orderBy",
  type: "choice",
  description: "Field to order entries by. Defaults to creation order.",
  options: (args: { 2?: string | undefined }, ctx: FnContext) => {
    const tableId = args[2];
    return mkFieldOptions(ctx.tables, tableId, undefined, {
      includeSystemId: true,
    });
  },
} as const;

const orderDirectionParam = {
  name: "orderDirection",
  label: "Direction",
  type: "choice",
  options: [
    {
      value: "asc",
      label: "Ascending",
    },
    {
      value: "desc",
      label: "Descending",
    },
  ] as { value: "asc" | "desc"; label: string }[],
  defaultValueHint: "Default: Ascending",
} as const;

const limitParam = {
  name: "limit",
  type: "number",
  description: "Maximum number of entries to fetch.",
} as const;

const offsetParam = {
  name: "offset",
  type: "number",
  description: "Number of entries to skip.",
  defaultValueHint: 0,
} as const;

const useDraftParam = {
  name: "useDraft",
  type: "boolean",
  description: "Whether to use draft data.",
  defaultValueHint: false,
} as const;

const localeParam = {
  name: "locale",
  type: "string",
  description: "The locale to use. Defaults to base locale.",
} as const;

export async function fetchTables(cmsId: string, cmsPublicToken: string) {
  const api = mkApi({
    databaseId: cmsId,
    databaseToken: cmsPublicToken,
    host: getCmsHost(),
  });

  return api.fetchTables();
}

export async function fetchContent(
  cmsId?: string,
  cmsPublicToken?: string,
  tableId?: string,
  select?: string[],
  whereLogic?: RulesLogic,
  orderBy?: string,
  orderDirection?: "asc" | "desc",
  limit?: number,
  offset?: number,
  useDraft?: boolean,
  locale?: string
) {
  if (!cmsId || !cmsPublicToken || !tableId) {
    return [];
  }

  const api = mkApi({
    databaseId: cmsId,
    databaseToken: cmsPublicToken,
    host: getCmsHost(),
    useDraft,
    locale,
  });

  return api.query(tableId, {
    fields: select,
    where: rulesLogicToCmsWhere(whereLogic),
    orderBy,
    desc: orderDirection === "desc",
    limit,
    offset,
  });
}

export async function fetchCount(
  cmsId?: string,
  cmsPublicToken?: string,
  tableId?: string,
  whereLogic?: RulesLogic,
  useDraft?: boolean
) {
  if (!cmsId || !cmsPublicToken || !tableId) {
    return 0;
  }

  const api = mkApi({
    databaseId: cmsId,
    databaseToken: cmsPublicToken,
    host: getCmsHost(),
    useDraft,
  });

  return api.count(tableId, {
    where: rulesLogicToCmsWhere(whereLogic),
  });
}

export function registerAllCmsFunctions(loader?: { registerFunction: any }) {
  function _registerFunction<T extends (...args: any[]) => any>(
    fn: T,
    meta: CustomFunctionMeta<T>
  ) {
    if (loader) {
      loader.registerFunction(fn, meta);
    } else {
      registerFunction(fn, meta);
    }
  }

  _registerFunction(fetchTables, {
    name: "fetchTables",
    namespace: "plasmicCms",
    displayName: "Fetch Plasmic CMS Tables",
    description: "Fetches table metadata from Plasmic CMS",
    importPath: "@plasmicpkgs/cms",
    params: [cmsIdParam, cmsPublicTokenParam],
  });

  _registerFunction(fetchContent, {
    name: "fetchContent",
    namespace: "plasmicCms",
    displayName: "Fetch Plasmic CMS Content",
    description: "Fetch content from a Plasmic CMS table",
    importPath: "@plasmicpkgs/cms",
    params: [
      cmsIdParam,
      cmsPublicTokenParam,
      tableIdParam,
      selectParam,
      whereLogicParam,
      orderByParam,
      orderDirectionParam,
      limitParam,
      offsetParam,
      useDraftParam,
      localeParam,
    ],
    fnContext: sharedTableFnContext,
  });

  _registerFunction(fetchCount, {
    name: "fetchCount",
    namespace: "plasmicCms",
    displayName: "Fetch Plasmic CMS Count",
    description: "Fetch the count of entries from a Plasmic CMS table",
    importPath: "@plasmicpkgs/cms",
    params: [
      cmsIdParam,
      cmsPublicTokenParam,
      tableIdParam,
      whereLogicParam,
      useDraftParam,
    ],
    fnContext: sharedTableFnContext,
  });
}

// Export utilities and types with underscore prefix
export { API as _API, HttpError as _HttpError, mkApi as _mkApi } from "./api";

export type {
  DatabaseConfig as _DatabaseConfig,
  QueryParams as _QueryParams,
} from "./api";

export { DEFAULT_HOST as _DEFAULT_HOST } from "./constants";

export { CmsMetaType as _CmsMetaType } from "./schema";
export type {
  ApiCmsQuery as _ApiCmsQuery,
  ApiCmsRow as _ApiCmsRow,
  ApiCmsTable as _ApiCmsTable,
} from "./schema";

export type {
  CmsBaseType as _CmsBaseType,
  CmsBoolean as _CmsBoolean,
  CmsDateTime as _CmsDateTime,
  CmsEnum as _CmsEnum,
  CmsFieldMeta as _CmsFieldMeta,
  CmsFile as _CmsFile,
  CmsImage as _CmsImage,
  CmsLongText as _CmsLongText,
  CmsNumber as _CmsNumber,
  CmsRef as _CmsRef,
  CmsRichText as _CmsRichText,
  CmsTableSchema as _CmsTableSchema,
  CmsText as _CmsText,
  CmsTextLike as _CmsTextLike,
  CmsType as _CmsType,
} from "./schema";

export {
  mkFieldOptions as _mkFieldOptions,
  mkTableOptions as _mkTableOptions,
} from "./util";
