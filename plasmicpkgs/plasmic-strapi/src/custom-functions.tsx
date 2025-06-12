import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";
import get from "dlv";
import qs from "qs";
import { filterFields, modulePath, queryParameters, uniq } from "./utils";

export const queryStrapiMeta: CustomFunctionMeta<typeof queryStrapi> = {
  name: "queryStrapi",
  displayName: "Query Strapi",
  description: "Query a Strapi collection",
  importPath: modulePath,
  params: [
    {
      name: "strapiHost",
      type: "string",
      description: "The Strapi host URL (e.g., https://example.com)",
    },
    {
      name: "strapiToken",
      type: "string",
      description:
        "The Strapi API token (optional, for authenticated requests)",
    },
    {
      name: "collection",
      type: "string",
      description: "The name of the Strapi collection to query",
    },
    {
      name: "filterField",
      type: "choice",
      options: (_, ctx) => {
        return ctx?.strapiFields;
      },
    },
    {
      name: "filterValue",
      type: "string",
      description:
        "The value to filter by (optional, if you want to filter results)",
    },
    {
      name: "filterParameter",
      type: "choice",
      description:
        "The parameter for filtering (e.g., 'eq', 'contains', etc.) (optional)",
      options: () => {
        return queryParameters.map((item: any) => ({
          label: item?.label,
          value: item?.value,
        }));
      },
    },
  ],
  fnContext: (host, token, collection) => {
    return {
      dataKey: JSON.stringify({ host, token, collection }),
      fetcher: async () => {
        if (!host) {
          return {};
        }
        const data = await queryStrapi(host, token, collection);
        if (!get(data.data, ["data"])) {
          return { strapiFields: [] };
        }

        const collectionData = get(data.data, ["data"]) as any[];

        const filteredFields = filterFields(collectionData);
        return { strapiFields: uniq(filteredFields ?? []) };
      },
    };
  },
};

export async function queryStrapi(
  host: string,
  token: string | undefined,
  collection: string | undefined,
  filterField?: string,
  filterValue?: string,
  filterParameter?: string
) {
  if (!host) {
    return null;
  }

  collection = collection ?? "";

  const query = host.trim() + "/api/" + collection.trim();

  const requestInit: any = { method: "GET" };
  if (token) {
    requestInit.headers = { Authorization: "Bearer " + token };
  }

  const queryParams = qs.stringify({
    ...(filterField && filterParameter && filterValue
      ? {
          filters: {
            [filterField]: {
              [filterParameter]: filterValue,
            },
          },
        }
      : {}),
    populate: "*",
  });

  const resp = await fetch(`${query}?${queryParams}`, requestInit);
  return resp.json();
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

  _registerFunction(queryStrapi, queryStrapiMeta);
}
