import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";

import { QueryParams, mkApi } from "./api";
import { DEFAULT_HOST } from "./constants";

function getCmsHost() {
  return (globalThis as any)["__PLASMIC_CMS_HOST__"] ?? DEFAULT_HOST;
}

function createTableOptions(
  _args: unknown[],
  ctx: { tables: Array<{ identifier: string; name: string }> } | undefined
): Array<{ value: string; label: string }> {
  if (!ctx?.tables) {
    return [];
  }
  return ctx.tables.map((table: { identifier: string; name: string }) => ({
    value: table.identifier,
    label: table.name,
  }));
}

const sharedTableFnContext = (
  cmsId?: string,
  cmsPublicToken?: string,
  ..._args: unknown[]
) => {
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
};

// TODO: Handle markdown in descriptions and link to https://docs.plasmic.app/learn/plasmic-cms-api-reference/#find-your-cms-ids-public-token-and-secret-token
const cmsIdParam = {
  name: "cmsId",
  type: "string",
  description: "The cms ID",
} as const;

const cmsPublicTokenParam = {
  name: "cmsPublicToken",
  type: "string",
  description: "The cms public token",
} as const;

const tableIdParam = {
  name: "tableId",
  type: "choice",
  options: createTableOptions,
} as const;

// TODO: Directly handle the inner params available options
const paramsParam = {
  name: "params",
  type: "object",
  description:
    "The parameters to filter the content (e.g., for sorting, limit, offset, advanced queries)",
} as const;

const useDraftParam = {
  name: "useDraft",
  type: "boolean",
  description: "Whether to use draft data. Defaults to false.",
} as const;

const localeParam = {
  name: "locale",
  type: "string",
  description: "The locale to use. Defaults to empty string.",
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
  cmsId: string,
  cmsPublicToken: string,
  tableId: string,
  params: QueryParams,
  useDraft: boolean,
  locale: string
) {
  const api = mkApi({
    databaseId: cmsId,
    databaseToken: cmsPublicToken,
    host: getCmsHost(),
    useDraft,
    locale,
  });

  return api.query(tableId, params);
}

export async function fetchCount(
  cmsId: string,
  cmsPublicToken: string,
  tableId: string,
  params: QueryParams,
  useDraft: boolean
) {
  const api = mkApi({
    databaseId: cmsId,
    databaseToken: cmsPublicToken,
    host: getCmsHost(),
    useDraft,
  });

  return api.count(tableId, params);
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
      paramsParam,
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
      paramsParam,
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
