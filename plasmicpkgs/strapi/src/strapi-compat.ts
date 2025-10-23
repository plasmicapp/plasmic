// This file contains Strapi code for handling v4/v5 compatibility.
// https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/new-response-format

export interface StrapiQueryResponse {
  data: StrapiItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

/** A primitive, item, item array, or null (for optional fields). */
export type StrapiValue =
  | boolean
  | number
  | string
  | StrapiItem
  | ReadonlyArray<StrapiItem>
  | ReadonlyArray<any> // For rich text content, JSON fields, etc.
  | Record<string, any> // For JSON fields, metadata objects, etc.
  | null;
type StrapiValueV4 =
  | boolean
  | number
  | string
  | { data: StrapiItemV4 | ReadonlyArray<StrapiItemV4> }
  | ReadonlyArray<any> // For rich text content, JSON fields, etc.
  | Record<string, any> // For JSON fields, metadata objects, etc.
  | null;
type StrapiValueV5 =
  | boolean
  | number
  | string
  | StrapiItemV5
  | ReadonlyArray<StrapiItemV5>
  | ReadonlyArray<any> // For rich text content, JSON fields, etc.
  | Record<string, any> // For JSON fields, metadata objects, etc.
  | null;

/** A content item or media item. */
export type StrapiItem = StrapiItemV4 | StrapiItemV5;
export interface StrapiItemV4 {
  id: number;
  attributes: {
    [attribute: string]: StrapiValueV4;
  };
}
export interface StrapiItemV5 {
  documentId: string;
  [attribute: string]: StrapiValueV5;
}
function isV5Item(item: StrapiItem): item is StrapiItemV5 {
  return "documentId" in item;
}

function isV4Item(item: StrapiItem): item is StrapiItemV5 {
  return "id" in item && "attributes" in item;
}

/** @internal */
export function isStrapiPrimitive(
  value: StrapiValue | undefined
): value is boolean | number | string {
  const type = typeof value;
  return type === "boolean" || type === "number" || type === "string";
}
/** @internal */
export function isStrapiItem(
  item: StrapiValue | undefined
): item is StrapiItem {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    return false;
  }
  // The object must be a valid v5 or v4 item
  return isV5Item(item as any) || isV4Item(item as any);
}
/** @internal */
export function isStrapiItemArray(
  value: StrapiValue | undefined
): value is ReadonlyArray<StrapiItem> {
  return typeof value === "object" && value !== null && Array.isArray(value);
}

/** @internal */
export function getId(item: StrapiItem): string {
  if (isV5Item(item)) {
    return item.documentId;
  } else {
    // v4
    return item.id.toString();
  }
}

/** @internal */
export function getItemKeys(item: StrapiItem) {
  if (isV5Item(item)) {
    return Object.keys(item).filter((key) => key !== "documentId");
  } else {
    // v4
    return Object.keys(item.attributes);
  }
}

/**
 * Gets the value, or undefined if the field key does not exist.
 * @internal
 */
export function getFieldValue(
  item: StrapiItem,
  key: string
): StrapiValue | undefined {
  if (isV5Item(item)) {
    return item[key];
  } else {
    // v4
    const value = item.attributes[key];
    if (value === null || value === undefined) {
      return value;
    }
    switch (typeof value) {
      case "boolean":
      case "number":
      case "string":
        return value;
      case "object":
        if (value && "data" in value) {
          return value.data;
        } else {
          return undefined;
        }
      default:
        return undefined;
    }
  }
}

/** This includes any asset such as image, video, audio, file */
export interface StrapiMediaAttributes {
  url: string;
  mime: string;
  ext: string;
  size: number;
  // width and height are null for non-image media (e.g. audio files)
  width: number | null;
  height: number | null;
  formats?: { [key: string]: Omit<StrapiMediaAttributes, "formats"> };
  // Added by transformMediaUrls - absolute URL with host prepended
  absoluteUrl?: string;
}

export interface StrapiImageAttribute extends StrapiMediaAttributes {
  width: number;
  height: number;
}
/**
 * Gets media attributes if it's a media item.
 *
 * This is the small subset of the fields that we care about.
 *
 * @internal
 */
export function getMediaAttributes(
  value: StrapiItem
): StrapiMediaAttributes | undefined {
  const attributes = isV5Item(value) ? value : value.attributes;
  if (
    "url" in attributes &&
    "mime" in attributes &&
    "ext" in attributes &&
    "size" in attributes
  ) {
    return attributes as { [attribute: string]: any } as StrapiMediaAttributes;
  } else {
    return undefined;
  }
}
