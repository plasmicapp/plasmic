import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";
import type { RulesLogic } from "json-logic-js";
import { mkApi } from "./api";
import { DEFAULT_HOST } from "./constants";
import { ApiCmsTable } from "./schema";
import { mkFieldOptions } from "./util";
import { cmsTableToQueryBuilderConfig, rulesLogicToCmsWhere } from "./where";

function getCmsHost(hostParam: string | undefined) {
  return hostParam ?? DEFAULT_HOST;
}

interface FnContext {
  tables: ApiCmsTable[];
}

interface BaseCMSOpts {
  host?: string;
  cmsId?: string;
  cmsPublicToken?: string;
}

interface CMSTableOpts extends BaseCMSOpts {
  tableId?: string;
}

function sharedTableFnContext({
  host,
  cmsId,
  cmsPublicToken,
}: BaseCMSOpts = {}): {
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
        host: getCmsHost(host),
      });
      const tables = await api.fetchTables();
      return { tables };
    },
  };
}

const hostParam = {
  type: "string",
  description: "CMS host URL.",
  helpText:
    "The Host URL of the CMS. You should not have to modify this for normal usage.",
  defaultValue: DEFAULT_HOST,
  advanced: true,
} as const;

const cmsIdParam = {
  type: "string",
  description: "ID of the CMS.",
  helpText:
    "Find the CMS ID on the [Plasmic CMS settings page](https://docs.plasmic.app/learn/plasmic-cms-api-reference/#find-your-cms-ids-public-token-and-secret-token)",
} as const;

const cmsPublicTokenParam = {
  type: "string",
  description: "Public token of the CMS.",
  helpText:
    "Find the public token on the [Plasmic CMS settings page](https://docs.plasmic.app/learn/plasmic-cms-api-reference/#find-your-cms-ids-public-token-and-secret-token)",
} as const;

const tableIdParam = {
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
  type: "choice",
  multiSelect: true,
  description: "Fields to fetch. Defaults to all fields.",
  defaultValueHint: ["Default: *"] as string[],
  options: ([opts]: [(CMSTableOpts | undefined)?], ctx: FnContext) => {
    const tableId = opts?.tableId;
    return mkFieldOptions(ctx.tables, tableId, undefined, {
      includeRefStars: true,
    });
  },
} as const;

const whereLogicParam = {
  type: "queryBuilder",
  description: "Filter fetched entries. Defaults to fetch all entries.",
  config: ([opts]: [(CMSTableOpts | undefined)?], ctx: FnContext) => {
    const tableId = opts?.tableId;
    const table = ctx.tables.find((t) => t.identifier === tableId);
    if (table) {
      return cmsTableToQueryBuilderConfig(table);
    } else {
      return { fields: {} };
    }
  },
} as const;

const orderByParam = {
  type: "choice",
  description: "Field to order entries by. Defaults to creation order.",
  options: ([opts]: [(CMSTableOpts | undefined)?], ctx: FnContext) => {
    const tableId = opts?.tableId;
    return mkFieldOptions(ctx.tables, tableId, undefined, {
      includeRefStars: true,
    });
  },
} as const;

const orderDirectionParam = {
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
  type: "number",
  description: "Maximum number of entries to fetch.",
} as const;

const offsetParam = {
  type: "number",
  description: "Number of entries to skip.",
  defaultValueHint: 0,
} as const;

const useDraftParam = {
  type: "boolean",
  description: "Whether to use draft data.",
  defaultValueHint: false,
} as const;

const localeParam = {
  type: "string",
  description: "The locale to use. Defaults to base locale.",
} as const;

export async function fetchTables({
  host,
  cmsId,
  cmsPublicToken,
}: BaseCMSOpts) {
  if (!cmsId || !cmsPublicToken) {
    return [];
  }

  const api = mkApi({
    databaseId: cmsId,
    databaseToken: cmsPublicToken,
    host: getCmsHost(host),
  });

  return api.fetchTables();
}

interface FetchContentOpts extends CMSTableOpts {
  select?: string[];
  whereLogic?: RulesLogic;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
  useDraft?: boolean;
  locale?: string;
}

export async function fetchContent({
  host,
  cmsId,
  cmsPublicToken,
  tableId,
  select,
  whereLogic,
  orderBy,
  orderDirection,
  limit,
  offset,
  useDraft,
  locale,
}: FetchContentOpts) {
  if (!cmsId || !cmsPublicToken || !tableId) {
    return [];
  }

  const api = mkApi({
    databaseId: cmsId,
    databaseToken: cmsPublicToken,
    host: getCmsHost(host),
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

interface FetchCountOpts extends CMSTableOpts {
  whereLogic?: RulesLogic;
  useDraft?: boolean;
}

export async function fetchCount({
  host,
  cmsId,
  cmsPublicToken,
  tableId,
  useDraft,
  whereLogic,
}: FetchCountOpts) {
  if (!cmsId || !cmsPublicToken || !tableId) {
    return 0;
  }

  const api = mkApi({
    databaseId: cmsId,
    databaseToken: cmsPublicToken,
    host: getCmsHost(host),
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
    params: [
      {
        type: "object",
        display: "flatten",
        name: "Opts",
        fields: {
          host: hostParam,
          cmsId: cmsIdParam,
          cmsPublicToken: cmsPublicTokenParam,
        },
      },
    ],
  });

  _registerFunction(fetchContent, {
    name: "fetchContent",
    namespace: "plasmicCms",
    displayName: "Fetch Plasmic CMS Content",
    description: "Fetch content from a Plasmic CMS table",
    importPath: "@plasmicpkgs/cms",
    params: [
      {
        type: "object",
        display: "flatten",
        name: "Opts",
        fields: {
          host: hostParam,
          cmsId: cmsIdParam,
          cmsPublicToken: cmsPublicTokenParam,
          tableId: tableIdParam,
          select: selectParam,
          whereLogic: whereLogicParam,
          orderBy: orderByParam,
          orderDirection: orderDirectionParam,
          limit: limitParam,
          offset: offsetParam,
          useDraft: useDraftParam,
          locale: localeParam,
        },
      },
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
      {
        type: "object",
        display: "flatten",
        name: "Opts",
        fields: {
          host: hostParam,
          cmsId: cmsIdParam,
          cmsPublicToken: cmsPublicTokenParam,
          tableId: tableIdParam,
          whereLogic: whereLogicParam,
          useDraft: useDraftParam,
        },
      },
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
