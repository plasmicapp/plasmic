import { CustomFunctionMeta } from "@plasmicapp/host/registerFunction";
import { _Entry } from "./types";

export const modulePath = "@plasmicpkgs/contentful";

export interface ContentfulQueryOptions {
  space: string;
  accessToken: string;
  environment?: string;
  contentType: string;
  filterField?: string;
  searchParameter?: string;
  filterValue?: string | number;
  order?: string;
  reverseOrder?: boolean;
  limit?: number;
  include?: number;
}

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

export async function queryContentful(
  space: string,
  accessToken: string,
  environment: string = "master",
  contentType?: string,
  filterField?: string,
  searchParameter?: string,
  filterValue?: string | number,
  order?: string,
  reverseOrder?: boolean,
  limit?: number,
  include?: number
): Promise<any> {
  if (!space || !accessToken) {
    throw new Error("Space and accessToken are required");
  }

  if (!contentType) {
    return null;
  }

  const baseUrl = "https://cdn.contentful.com";
  const path = `/spaces/${space}/environments/${environment}/entries`;
  const searchParams = new URLSearchParams();

  searchParams.set("access_token", accessToken);
  searchParams.set("content_type", contentType);

  if (limit) {
    searchParams.set("limit", limit.toString());
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

  if (filterField && searchParameter && filterValue !== undefined) {
    searchParams.set(
      `fields.${filterField}${searchParameter}`,
      filterValue.toString()
    );
  }

  const resp = await fetch(`${baseUrl}${path}?${searchParams.toString()}`);
  const data = await resp.json();

  return denormalizeData(data);
}

export const queryContentfulMeta: CustomFunctionMeta<typeof queryContentful> = {
  name: "queryContentful",
  displayName: "Query Contentful",
  description: "Query Contentful entries with filtering and ordering",
  importPath: modulePath,
  params: [
    {
      name: "space",
      type: "string",
      description: "Contentful space ID",
    },
    {
      name: "accessToken",
      type: "string",
      description: "Contentful access token",
    },
    {
      name: "environment",
      type: "string",
      description: "Contentful environment (default: master)",
    },
    {
      name: "contentType",
      type: "string",
      description: "Content type to query",
    },
    {
      name: "filterField",
      type: "string",
      description: "Field to filter by (optional)",
    },
    {
      name: "searchParameter",
      type: "string",
      description:
        "Search parameter for filtering (e.g., [match], [lt], [gte])",
    },
    {
      name: "filterValue",
      type: "string",
      description: "Value to filter by",
    },
    {
      name: "order",
      type: "string",
      description: "Field to order by (optional)",
    },
    {
      name: "reverseOrder",
      type: "boolean",
      description: "Reverse the order",
    },
    {
      name: "limit",
      type: "number",
      description: "Limit number of results",
    },
    {
      name: "include",
      type: "number",
      description: "Depth of linked items to include (max 10)",
    },
  ],
};
