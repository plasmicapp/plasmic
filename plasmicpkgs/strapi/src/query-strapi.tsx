import { CustomFunctionMeta } from "@plasmicapp/host/registerFunction";
import qs from "qs";
import { StrapiQueryResponse } from "./strapi-compat";
import {
  extractFilterableFields,
  normalizeUrl,
  queryParameters,
  transformMediaUrls,
} from "./utils";

export const queryStrapiMeta: CustomFunctionMeta<typeof queryStrapi> = {
  name: "queryStrapi",
  displayName: "Query Strapi",
  description: "Query a Strapi collection",
  importPath: "@plasmicpkgs/strapi",
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
        const resp = await queryStrapi(host, token, collection);
        const collectionData = resp?.data;
        if (!collectionData) {
          return { strapiFields: [] };
        }

        return { strapiFields: extractFilterableFields(collectionData) };
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
): Promise<StrapiQueryResponse | null> {
  if (!host || !collection) {
    return null;
  }

  const query = normalizeUrl(host) + "/api/" + collection.trim();

  const requestInit: RequestInit = { method: "GET" };
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
  const data = await resp.json();

  // Transform all relative media URLs to absolute URLs
  return transformMediaUrls(data, host);
}
