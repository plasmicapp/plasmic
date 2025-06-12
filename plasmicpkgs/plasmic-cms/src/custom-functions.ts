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

export function registerAllCustomFunctions(loader?: { registerFunction: any }) {
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
    description: "Fetches the tables from the cms",
    importPath: "@plasmicpkgs/plasmic-cms",
    params: [cmsIdParam, cmsPublicTokenParam],
  });

  _registerFunction(fetchContent, {
    name: "fetchContent",
    description: "Fetch content from a cms table",
    importPath: "@plasmicpkgs/plasmic-cms",
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
    description: "Fetch the count of entries from a cms table",
    importPath: "@plasmicpkgs/plasmic-cms",
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
