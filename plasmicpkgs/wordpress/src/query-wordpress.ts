import { CustomFunctionMeta } from "@plasmicapp/host/registerFunction";
import type { RulesLogic } from "json-logic-js";
import { cleanUrl, QueryOperator } from "./utils";
import {
  buildWordPressConfig,
  fetchCategories,
  fetchTags,
  rulesLogicToWordPressFilters,
  type WordPressFilters,
} from "./where";

/**
 * @deprecated These filter props are deprecated. Use `filterLogic` with the query builder instead.
 * Only used by the deprecated plasmic-wordpress package
 */
export interface QueryWordpressOldFilterProps {
  queryOperator?: QueryOperator;
  filterValue?: string;
}

export interface QueryWordpressOpts {
  wordpressUrl?: string;
  queryType?: "pages" | "posts";

  /**
   * Filter logic using JSON Logic format to filter WordPress entries.
   * See {@link https://www.npmjs.com/package/@types/json-logic-js?activeTab=readme}
   */
  filterLogic?: RulesLogic;

  // Pagination
  limit?: number;
  page?: number;
  offset?: number;

  // Ordering
  reverseOrder?: boolean;
  orderby?: string;
}

export interface QueryWordpressResponse {
  items: any[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
}

/**
 * Query Wordpress with simplified filter props.
 *
 * @deprecated Use {@link queryWordpress} with `filterLogic` parameter instead.
 *
 * @example
 * ```ts
 * // Old way (deprecated)
 * _queryWordpress({
 *   wordpressUrl: 'https://example.com',
 *   queryType: 'posts',
 *   queryOperator: 'status',
 *   filterValue: 'publish'
 * });
 *
 * // New way
 * queryWordpress({
 *   wordpressUrl: 'https://example.com',
 *   queryType: 'posts',
 *   filterLogic: { "==": [{ var: "status" }, "publish"] },
 * });
 * ```
 */
export async function _queryWordpress(
  opts: QueryWordpressOpts & QueryWordpressOldFilterProps
): Promise<QueryWordpressResponse> {
  const {
    wordpressUrl,
    queryType,
    queryOperator,
    filterValue,
    filterLogic,
    limit,
    page,
    offset,
    reverseOrder,
    orderby,
  } = opts;

  if (!wordpressUrl || !queryType) {
    throw new Error("Wordpress URL and query type are required");
  }

  const urlParams = new URLSearchParams();

  if (filterLogic) {
    const filters = rulesLogicToWordPressFilters(filterLogic);
    appendFiltersToParams(urlParams, filters);
  }
  // Legacy: Single filter support for backward compatibility (deprecated)
  // @deprecated - Use filterLogic instead
  else if (queryOperator && filterValue) {
    urlParams.append(queryOperator, filterValue);
  }

  // Pagination
  if (limit) {
    urlParams.append("per_page", String(Math.min(limit, 100)));
  }
  if (page) {
    urlParams.append("page", String(page));
  }
  if (offset) {
    urlParams.append("offset", String(offset));
  }

  // Ordering
  if (reverseOrder) {
    urlParams.append("order", "asc");
  }
  if (orderby) {
    urlParams.append("orderby", orderby);
  }

  const url = new URL(`wp-json/wp/v2/${queryType}`, cleanUrl(wordpressUrl));
  url.search = urlParams.toString();

  const resp = await fetch(url);

  if (!resp.ok) {
    const errorText = await resp.text();
    let errorMessage = `WordPress API error (${resp.status})`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      errorMessage += `: ${errorText}`;
    }
    throw new Error(errorMessage);
  }

  const items = await resp.json();

  // Extract pagination headers
  const total = parseInt(resp.headers.get("X-WP-Total") || "0", 10);
  const totalPages = parseInt(resp.headers.get("X-WP-TotalPages") || "0", 10);

  return {
    items,
    total,
    totalPages,
    page: page || 1,
    perPage: limit || 10,
  };
}

/**
 * Query WordPress posts or pages with optional filtering, pagination, and ordering.
 *
 * @param opts - Query options including URL, content type, filter logic, pagination, and ordering
 * @returns Promise resolving to the WordPress query response or raw items array for backward compatibility
 *
 * @example
 * ```ts
 * // Fetch all published posts
 * const result = await queryWordpress({
 *   wordpressUrl: 'https://example.com',
 *   queryType: 'posts'
 * });
 *
 * // Fetch with filters
 * const filtered = await queryWordpress({
 *   wordpressUrl: 'https://example.com',
 *   queryType: 'posts',
 *   filterLogic: { "==": [{ var: "status" }, "publish"] },
 * });
 * ```
 */
export async function queryWordpress(
  opts: QueryWordpressOpts
): Promise<QueryWordpressResponse | any> {
  return _queryWordpress(opts);
}

function appendFiltersToParams(
  params: URLSearchParams,
  filters: WordPressFilters
): void {
  // Add all filter parameters
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      // WordPress accepts comma-separated values for arrays
      params.append(key, value.join(","));
    } else {
      params.append(key, String(value));
    }
  }
}

export const queryWordpressMeta: CustomFunctionMeta<typeof queryWordpress> = {
  name: "queryWordpress",
  displayName: "Query WordPress",
  importPath: "@plasmicpkgs/wordpress",
  params: [
    {
      name: "opts",
      type: "object",
      display: "flatten",
      fields: {
        wordpressUrl: {
          type: "string",
          displayName: "WordPress URL",
          description:
            "Base URL of your WordPress site (e.g., https://example.com)",
          helpText: "The root URL of your WordPress installation",
        },
        queryType: {
          type: "choice",
          options: [
            { label: "Posts", value: "posts" },
            { label: "Pages", value: "pages" },
          ],
          displayName: "Content Type",
          description: "Type of content to query",
          defaultValue: "posts",
        },

        filterLogic: {
          type: "queryBuilder",
          displayName: "Filters",
          description: "Filter fetched entries. Defaults to fetch all entries.",
          config: (_: any, ctx: any) => {
            const { queryType, categories, tags } = ctx;
            if (!queryType) {
              return { fields: {} };
            }

            return buildWordPressConfig(queryType, categories, tags);
          },
        },

        // Pagination
        page: {
          type: "number",
          displayName: "Page",
          description: "Page number for pagination (starts at 1)",
          min: 1,
          defaultValueHint: 1,
        },
        limit: {
          type: "number",
          displayName: "Items per page",
          description: "Maximum number of items to return (max: 100)",
          min: 1,
          max: 100,
          defaultValueHint: 10,
        },
        offset: {
          type: "number",
          displayName: "Offset",
          description: "Number of items to skip",
          min: 0,
          hidden: (opts: any) => !!opts.page, // Hide if page is being used
          defaultValueHint: 0,
        },

        // Ordering
        // One of: author, date, id, include, modified, parent, relevance, slug, include_slugs, title
        orderby: {
          type: "choice",
          options: ([opts]) => [
            {
              label: "Relevance (search results)",
              value: "relevance",
            },
            {
              label: "Publish date",
              value: "date",
            },
            {
              label: "Last modified date",
              value: "modified",
            },
            {
              label: "Title (A–Z)",
              value: "title",
            },
            {
              label: "Slug (URL)",
              value: "slug",
            },
            {
              label: "Author",
              value: "author",
            },
            {
              label: "ID",
              value: "id",
            },
            ...(opts?.queryType === "pages"
              ? [
                  {
                    label: "Menu order",
                    value: "menu_order",
                  },
                  {
                    label: "Parent page",
                    value: "parent",
                  },
                ]
              : []),
          ],
          displayName: "Sort by",
          description: "Field to sort results by",
          defaultValueHint: "date",
        },
        reverseOrder: {
          type: "boolean",
          displayName: "Reverse order",
          description: "Reverse the order of the results",
          defaultValueHint: false,
        },
      },
    },
  ],
  fnContext: (wordpressOpts?: QueryWordpressOpts) => {
    const { wordpressUrl, queryType } = wordpressOpts ?? {};
    if (!wordpressUrl || !queryType) {
      return {
        dataKey: "",
        fetcher: async () => ({ categories: [], tags: [] }),
      };
    }

    return {
      dataKey: `${wordpressUrl}:${queryType}`,
      fetcher: async () => {
        if (queryType === "posts") {
          const [categories, tags] = await Promise.all([
            fetchCategories(wordpressUrl),
            fetchTags(wordpressUrl),
          ]);

          return { categories, tags, queryType };
        }

        return { categories: [], tags: [], queryType };
      },
    };
  },
};
