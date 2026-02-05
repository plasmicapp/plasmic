import { CustomFunctionMeta } from "@plasmicapp/host/registerFunction";
import type { RulesLogic } from "json-logic-js";
import {
  ContentTypeField,
  ContentTypeSchema,
  fetchContentTypes,
  findContentTypeSchema,
} from "./schema";
import { _Entry } from "./types";
import { BASE_URL, capitalize } from "./utils";
import {
  rulesLogicToContentfulFilters,
  schemaToQueryBuilderConfig,
} from "./where";

export const modulePath = "@plasmicpkgs/contentful";

export function denormalizeData(data: any | null): any {
  if (!data?.items || !data?.includes) {
    return data;
  }

  const entryMap: { [id: string]: any } = {};

  if (data.includes.Entry) {
    data.includes.Entry.forEach((entry: any) => {
      entryMap[entry.sys.id] = entry;
    });
  }

  // Track processed fields to avoid following circular references
  const processedFields = new Set<string>();

  const denormalizeField = (fieldValue: any): any => {
    if (Array.isArray(fieldValue)) {
      const updatedArray: any[] = fieldValue.map((arrayItem) => {
        return denormalizeField(arrayItem);
      });
      return updatedArray;
    } else if (fieldValue && typeof fieldValue === "object") {
      if (
        data.includes.Asset &&
        "sys" in fieldValue &&
        fieldValue.sys.linkType === "Asset"
      ) {
        const fieldId = fieldValue.sys.id;
        const asset = data.includes.Asset.find(
          (a: any) => a.sys.id === fieldId
        );
        if (asset) {
          fieldValue = {
            ...fieldValue,
            url: "https:" + asset.fields?.file?.url,
          };
        } else {
          console.log(`Asset URL not found for ID: ${fieldId}`);
        }
      } else if (
        data.includes.Entry &&
        "sys" in fieldValue &&
        fieldValue.sys.linkType === "Entry"
      ) {
        const fieldId = fieldValue.sys.id;
        if (entryMap[fieldId]) {
          if (processedFields.has(fieldId)) {
            console.warn(
              `Circular reference detected for Entry ID: ${fieldId}.`
            );
          } else {
            fieldValue = {
              ...fieldValue,
              fields: denormalizeItem(entryMap[fieldId]).fields,
            };
          }
        } else {
          console.log(`Entry not found for ID: ${fieldId}`);
        }
      }
      fieldValue = Object.entries(fieldValue).reduce((obj, [key, value]) => {
        if (key === "sys" || key === "fields") {
          obj[key] = value;
        } else {
          obj[key] = denormalizeField(value);
        }
        return obj;
      }, {} as Record<string, any>);
    }

    return fieldValue;
  };

  const denormalizeItem = (item: any) => {
    const itemId = item.sys?.id;
    if (itemId) {
      processedFields.add(itemId);
    }

    const updatedFields: { [fieldName: string]: unknown | unknown[] } = {};
    for (const fieldName in item.fields) {
      updatedFields[fieldName] = denormalizeField(item.fields[fieldName]);
    }

    if (itemId) {
      processedFields.delete(itemId);
    }

    return {
      ...item,
      fields: updatedFields ?? undefined,
    };
  };

  const itemsWithDenormalizedFields: _Entry[] = data.items.map((item: any) => {
    return denormalizeItem(item);
  });

  return {
    ...data,
    items: itemsWithDenormalizedFields,
  };
}

/**
 * @deprecated These filter props are deprecated. Use `filterLogic` with the query builder instead.
 * Only used by the deprecated ContentfulCollection component for backward compatibility.
 */
export interface QueryContentfulOldFilterProps {
  filterField?: string;
  searchParameter?: string;
  filterValue?: string | number;
}

export interface QueryContentfulOpts {
  space?: string;
  accessToken?: string;
  environment?: string;
  contentType?: string;
  /**
   * Filter logic using JSON Logic format to filter Contentful entries.
   * See {@link https://www.npmjs.com/package/@types/json-logic-js?activeTab=readme}
   */
  filterLogic?: RulesLogic;
  order?: string;
  reverseOrder?: boolean;
  limit?: number;
  skip?: number;
  include?: number;
  // string type supports comma-separated string as documented in the Contentful API, inserted via the dynamic value editor
  // array type supports multiple fields to be selected via the choice prop editor for convenience
  select?: string | string[];
  locale?: string;
}

/**
 * Query Contentful with simplified filter props.
 *
 * @deprecated Use {@link queryContentful} with `filterLogic` parameter instead.
 *
 * @example
 * ```ts
 * // Old way (deprecated)
 * _queryContentful({
 *   space: 'space-id',
 *   accessToken: 'token',
 *   contentType: 'article',
 *   filterField: 'title',
 *   searchParameter: '[match]',
 *   filterValue: 'Hello'
 * })
 *
 * // New way
 * queryContentful({
 *   space: 'space-id',
 *   accessToken: 'token',
 *   contentType: 'article',
 *   filterLogic: { "==": [{ var: "title" }, "Hello"] }
 * })
 * ```
 */
export async function _queryContentful({
  space,
  accessToken,
  environment = "master",
  contentType,
  filterLogic,
  filterField,
  searchParameter,
  filterValue,
  order,
  reverseOrder,
  limit,
  skip,
  include,
  select,
  locale,
}: QueryContentfulOpts & QueryContentfulOldFilterProps): Promise<any> {
  if (!space || !accessToken) {
    throw new Error("Space and accessToken are required");
  }

  if (!contentType) {
    return null;
  }

  const path = `/spaces/${space}/environments/${environment}/entries`;
  const searchParams = new URLSearchParams();

  searchParams.set("access_token", accessToken);
  searchParams.set("content_type", contentType);

  // Convert filterLogic to Contentful filters
  let filters: Record<string, any> = {};
  if (filterLogic) {
    filters = rulesLogicToContentfulFilters(filterLogic);
  } else if (filterField && searchParameter && filterValue !== undefined) {
    // BACKWARD COMPATIBILITY: Legacy filter props
    filters[`fields.${filterField}${searchParameter}`] = filterValue.toString();
  }

  // Apply all filter parameters
  for (const [key, value] of Object.entries(filters)) {
    searchParams.set(key, value.toString());
  }

  if (limit) {
    searchParams.set("limit", limit.toString());
  }

  if (skip !== undefined) {
    searchParams.set("skip", skip.toString());
  }

  if (order) {
    searchParams.set(
      "order",
      `${reverseOrder ? "-" : ""}${
        order.startsWith("sys.") ? order : `fields.${order}`
      }`
    );
  }

  if (include !== undefined) {
    searchParams.set("include", include.toString());
  }

  if (select) {
    if (Array.isArray(select)) {
      if (select.length > 0) {
        searchParams.set("select", select.join(","));
      }
    } else {
      // The user may pass a comma-separated string as documented in the Contentful API
      searchParams.set("select", select);
    }
  }

  if (locale) {
    searchParams.set("locale", locale);
  }

  const resp = await fetch(`${BASE_URL}${path}?${searchParams.toString()}`);
  const data = await resp.json();

  return denormalizeData(data);
}

/**
 * Query a Contentful content type with optional filtering and ordering.
 *
 * @param opts - Query options including space, accessToken, contentType, filter logic, and pagination
 * @returns Promise resolving to the Contentful query response with denormalized data
 *
 * @example
 * ```ts
 * // Fetch all entries
 * const result = await queryContentful({
 *   space: 'your-space-id',
 *   accessToken: 'your-access-token',
 *   contentType: 'blogPost'
 * });
 *
 * // Fetch with filter
 * const filtered = await queryContentful({
 *   space: 'your-space-id',
 *   accessToken: 'your-access-token',
 *   contentType: 'blogPost',
 *   filterLogic: { "==": [{ var: "status" }, "published"] }
 * });
 * ```
 */
export async function queryContentful({
  space,
  accessToken,
  environment = "master",
  contentType,
  filterLogic,
}: QueryContentfulOpts): Promise<any> {
  return _queryContentful({
    space,
    accessToken,
    environment,
    contentType,
    filterLogic,
  });
}

export const queryContentfulMeta: CustomFunctionMeta<typeof queryContentful> = {
  name: "queryContentful",
  displayName: "Query Contentful",
  description: "Query Contentful entries with filtering and ordering",
  importPath: modulePath,
  params: [
    {
      name: "opts",
      type: "object",
      display: "flatten",
      fields: {
        space: {
          type: "string",
          description: "Contentful space ID",
        },
        accessToken: {
          type: "string",
          description: "Contentful access token",
        },
        environment: {
          type: "string",
          description: "Contentful environment (default: master)",
        },
        contentType: {
          type: "choice",
          displayName: "Content Type",
          description: "Content type to query",
          options: (_: any, ctx: any) => {
            return (
              ctx?.contentTypes?.map((ct: ContentTypeSchema) => ({
                label: ct.name,
                value: ct.sys.id,
              })) ?? []
            );
          },
        },
        filterLogic: {
          type: "queryBuilder",
          displayName: "Filter",
          description: "Filter fetched entries. Defaults to fetch all entries.",
          config: ([opts], ctx: any) => {
            const schema = findContentTypeSchema(
              opts?.contentType,
              ctx?.contentTypes
            );

            if (schema) {
              return schemaToQueryBuilderConfig(schema);
            }

            return {
              fields: {},
            };
          },
        },
        order: {
          type: "choice",
          displayName: "Order by",
          description: "Field to order by (optional)",
          defaultValueHint: "sys.updatedAt",
          options: ([opts], ctx: any) => {
            const systemFields = [
              { label: "Created at", value: "sys.createdAt" },
              { label: "Updated at", value: "sys.updatedAt" },
              { label: "ID", value: "sys.id" },
            ];

            const schema = findContentTypeSchema(
              opts?.contentType,
              ctx?.contentTypes
            );

            if (schema) {
              const contentFields = schema.fields
                .filter((field: ContentTypeField) => !field.disabled)
                .map((field: ContentTypeField) => ({
                  label: capitalize(field.name),
                  value: `fields.${field.id}`,
                }));

              return [...systemFields, ...contentFields];
            }

            return systemFields;
          },
        },
        reverseOrder: {
          type: "boolean",
          description: "Reverse the order",
          hidden: ([opts]: [QueryContentfulOpts | undefined]) => !opts?.order,
          defaultValueHint: false,
        },
        limit: {
          type: "number",
          description: "Limit number of results",
          defaultValueHint: 100,
        },
        skip: {
          type: "number",
          description: "Skip number of results (for pagination)",
          defaultValueHint: 0,
        },
        include: {
          type: "number",
          description: "Depth of linked items to include (max 10)",
          max: 10,
          min: 0,
          defaultValueHint: 1,
        },
        select: {
          type: "choice",
          multiSelect: true,
          description: "Fields to select. Defaults to all fields.",
          options: ([opts], ctx: any) => {
            const schema = findContentTypeSchema(
              opts?.contentType,
              ctx?.contentTypes
            );

            const fieldOptions = schema
              ? schema.fields
                  .filter((field: ContentTypeField) => !field.disabled)
                  .map((field: ContentTypeField) => ({
                    label: capitalize(field.name), // Use capitalized friendly name from schema
                    value: `fields.${field.id}`,
                  }))
              : [];

            return [
              ...fieldOptions,
              { label: "Fields only", value: "fields" },
              { label: "Metadata only", value: "sys" },
            ];
          },
        },
        locale: {
          type: "string",
          description: "Locale code (e.g., en-US)",
        },
      },
    },
  ],
  fnContext: (contentfulOpts?: QueryContentfulOpts) => {
    if (!contentfulOpts?.space || !contentfulOpts?.accessToken) {
      return {
        dataKey: "",
        fetcher: async () => ({
          contentTypes: [],
        }),
      };
    }

    // Cache at workspace level (space + environment) to fetch all schemas once.
    // Excluding contentType from cache key means switching content types won't
    // trigger new API calls - we just find the schema in the cached array.
    const workspaceCacheKey = JSON.stringify({
      space: contentfulOpts.space,
      accessToken: contentfulOpts.accessToken,
      environment: contentfulOpts.environment,
    });

    return {
      dataKey: workspaceCacheKey,
      fetcher: async () => {
        try {
          // Fetch all content types once (includes full schemas with fields)
          const contentTypes = await fetchContentTypes(
            contentfulOpts.space!,
            contentfulOpts.accessToken!,
            contentfulOpts.environment
          );

          return {
            contentTypes,
          };
        } catch (error) {
          console.error("Failed to fetch content types:", error);
          return {
            contentTypes: [],
          };
        }
      },
    };
  },
};
