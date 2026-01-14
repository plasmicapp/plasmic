import { CustomFunctionMeta } from "@plasmicapp/host/registerFunction";
import type { RulesLogic } from "json-logic-js";
import qs from "qs";
import { getFieldValue, StrapiQueryResponse } from "./strapi-compat";
import {
  extractFilterableFields,
  normalizeUrl,
  transformMediaUrls,
} from "./utils";
import {
  rulesLogicToStrapiFilters,
  strapiFieldsToQueryBuilderConfig,
} from "./where";

export const queryStrapiMeta: CustomFunctionMeta<typeof queryStrapi> = {
  name: "queryStrapi",
  displayName: "Query Strapi",
  description: "Query a Strapi collection",
  importPath: "@plasmicpkgs/strapi",
  params: [
    {
      name: "opts",
      type: "object",
      display: "flatten",
      fields: {
        host: {
          type: "string",
          description: "The Strapi host URL (e.g., https://example.com)",
        },
        token: {
          type: "string",
          description:
            "The Strapi API token (optional, for authenticated requests)",
        },
        collection: {
          type: "string",
          description: "The name of the Strapi collection to query",
        },
        filterLogic: {
          type: "queryBuilder",
          description: "Filter fetched entries. Defaults to fetch all entries.",
          config: (_: any, ctx: any) => {
            const fields = ctx?.strapiFields || [];
            return strapiFieldsToQueryBuilderConfig(fields, ctx?.sampleData);
          },
        },
      },
    },
  ],
  fnContext: (strapiOpts?: QueryStrapiOpts) => {
    if (!strapiOpts?.host) {
      return {
        dataKey: "",
        fetcher: async () => {
          return {};
        },
      };
    }
    // Exclude filterLogic from dataKey to prevent refetching when user types in query builder
    // The fields and sampleData should only depend on host, token, and collection
    const fetchOpts: QueryStrapiOpts = {
      host: strapiOpts.host,
      token: strapiOpts.token,
      collection: strapiOpts.collection,
    };
    return {
      dataKey: JSON.stringify(fetchOpts),
      fetcher: async () => {
        const resp = await queryStrapi(fetchOpts);
        const collectionData = resp?.data;
        if (!collectionData) {
          return { strapiFields: [] };
        }

        // Extract field values from multiple items for type inference
        // Check up to 10 items to find non-null values for each field
        const sampleData: Record<string, any> = {};
        const fields = extractFilterableFields(collectionData);
        const itemsToCheck = collectionData.slice(0, 10);
        // For each field, find the first non-null value across multiple items
        for (const field of fields) {
          for (const item of itemsToCheck) {
            if (item) {
              const value = getFieldValue(item, field);
              if (value !== null && value !== undefined) {
                sampleData[field] = value;
                break;
              }
            }
          }
        }

        return {
          strapiFields: fields,
          sampleData,
        };
      },
    };
  },
};

// Simplified filter props only intended for use by the deprecated StrapiCollection component
export interface StrapiQueryOldFilterProps {
  filterField?: string;
  filterValue?: string;
  filterParameter?: string;
}

export interface QueryStrapiOpts {
  host?: string;
  token?: string;
  collection?: string;
  /**
   * Filter logic using JSON Logic format to filter Strapi entries.
   * See {@link https://www.npmjs.com/package/@types/json-logic-js?activeTab=readme}
   */
  filterLogic?: RulesLogic;
}

/**
 * Query a Strapi collection with optional filtering.
 *
 * @param opts - Query options including host, token, collection, and filter logic
 * @returns Promise resolving to the Strapi query response or null if required params are missing
 *
 * @example
 * ```ts
 * // Fetch all entries
 * const result = await queryStrapi({
 *   host: 'https://api.example.com',
 *   token: 'your-api-token',
 *   collection: 'articles'
 * });
 *
 * // Fetch with filter
 * const filtered = await queryStrapi({
 *   host: 'https://api.example.com',
 *   token: 'your-api-token',
 *   collection: 'articles',
 *   filterLogic: { "==": [{ var: "status" }, "published"] }
 * });
 * ```
 */
export async function queryStrapi({
  host,
  token,
  collection,
  filterLogic,
}: QueryStrapiOpts): Promise<StrapiQueryResponse | null> {
  return _queryStrapi({ host, token, collection, filterLogic });
}

/**
 * Query Strapi with simplified filter props.
 *
 * @deprecated Use {@link queryStrapi} with `filterLogic` parameter instead.
 *
 * @example
 * ```ts
 * // Old way (deprecated)
 * _queryStrapi({ filterField: 'name', filterValue: 'John' })
 *
 * // New way
 * queryStrapi({
 *   filterLogic: {"==": [{ var: "name" }, "John"]}
 * })
 * ```
 */
export async function _queryStrapi({
  host,
  token,
  collection,
  filterLogic,
  filterField,
  filterValue,
  filterParameter,
}: QueryStrapiOpts &
  StrapiQueryOldFilterProps): Promise<StrapiQueryResponse | null> {
  if (!host || !collection) {
    return null;
  }

  const query = normalizeUrl(host) + "/api/" + collection.trim();

  const requestInit: RequestInit = { method: "GET" };
  if (token) {
    requestInit.headers = { Authorization: "Bearer " + token };
  }

  let filters: Record<string, any> = {};
  if (filterLogic) {
    filters = rulesLogicToStrapiFilters(filterLogic);
  } else if (filterField && filterParameter && filterValue) {
    filters = {
      [filterField]: {
        [filterParameter]: filterValue,
      },
    };
  }

  // Build query parameters for Strapi REST API
  // Strapi uses nested query parameters like: filters[$and][0][field][$eq]=value
  const queryParams = qs.stringify({
    filters,
    populate: "*",
  });

  const resp = await fetch(`${query}?${queryParams}`, requestInit);
  const data = await resp.json();

  // Transform all relative media URLs to absolute URLs
  return transformMediaUrls(data, host);
}
