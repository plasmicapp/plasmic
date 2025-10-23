import {
  StrapiImageAttribute,
  StrapiItem,
  StrapiMediaAttributes,
  StrapiQueryResponse,
  getFieldValue,
  getItemKeys,
  getMediaAttributes,
  isStrapiItem,
  isStrapiPrimitive,
} from "./strapi-compat";

/**
 * https://docs-v4.strapi.io/dev-docs/api/entity-service/filter
 * @internal
 */
export const queryParameters = [
  {
    value: "$eq",
    label: "Equal",
  },
  {
    value: "$ne",
    label: "Not equal",
  },
  {
    value: "$lt",
    label: "Less than",
  },
  {
    value: "$lte",
    label: "Less than or equal to",
  },
  {
    value: "$gt",
    label: "Greater than",
  },
  {
    value: "$gte",
    label: "Greater than or equal to",
  },
  {
    value: "$in",
    label: "Included in an array",
  },
  {
    value: "$notIn",
    label: "Not included in an array",
  },
  {
    value: "$contains",
    label: "Contains",
  },
  {
    value: "$notContains",
    label: "Does not contain",
  },
];

/**
 * Checks if the media attribute contains an image media
 * @internal
 */
export function isImage(
  mediaAttr: StrapiMediaAttributes
): mediaAttr is StrapiImageAttribute {
  return mediaAttr?.mime.startsWith("image");
}

/**
 * Removes leading and trailing slash and whitespace characters from a URL
 * @internal
 */
export function normalizeUrl(url: string): string {
  return (
    url
      .trim()
      // remove leading slash
      .replace(/^\/+/, "")
      // remove leading trailing
      .replace(/\/+$/, "")
  );
}

/**
 * Extracts fields whose types can be filtered in Plasmic.
 * @internal
 */
export function extractFilterableFields(
  items: StrapiItem | StrapiItem[]
): string[] {
  if (Array.isArray(items)) {
    return Array.from(new Set(items.flatMap(filterableFields)));
  } else {
    return filterableFields(items);
  }
}

function filterableFields(item: StrapiItem): string[] {
  return getItemKeys(item).filter((key) => {
    const value = getFieldValue(item, key);
    return isStrapiPrimitive(value);
  });
}

/**
 * Extracts fields whose types can be displayed in Plasmic.
 * @internal
 */
export function extractDisplayableFields(
  items: StrapiItem | StrapiItem[]
): string[] {
  if (Array.isArray(items)) {
    return Array.from(new Set(items.flatMap(displayableFields)));
  } else {
    return displayableFields(items);
  }
}

function displayableFields(item: StrapiItem): string[] {
  return getItemKeys(item).filter((key) => {
    const value = getFieldValue(item, key);
    return (
      isStrapiPrimitive(value) ||
      (isStrapiItem(value) && getMediaAttributes(value))
    );
  });
}

/**
 * Traverses @param data and adds an absoluteUrl field to all media items by prepending the @param host to the url
 * @internal
 */
export function transformMediaUrls(
  data: StrapiQueryResponse,
  host: string
): StrapiQueryResponse {
  if (data === null || data === undefined) {
    return data;
  }

  const normalizedHost = normalizeUrl(host);

  /**
   * Converts a relative URL to absolute by prepending the host.
   * If URL is already absolute, returns it unchanged.
   */
  function makeAbsoluteUrl(url: string): string {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return normalizedHost + "/" + normalizeUrl(url);
  }

  /**
   * Adds absoluteUrl to a media item and its format variations
   */
  function transformMediaItem(mediaAttrs: StrapiMediaAttributes): void {
    mediaAttrs.absoluteUrl = makeAbsoluteUrl(mediaAttrs.url);

    // Transform format variations (thumbnail, small, medium, large, etc.)
    if (mediaAttrs.formats && typeof mediaAttrs.formats === "object") {
      for (const formatKey of Object.keys(mediaAttrs.formats)) {
        transformMediaItem(mediaAttrs.formats[formatKey]);
      }
    }
  }

  /**
   * Recursively traverses a Strapi item and transforms all nested media
   */
  function transformStrapiItem(item: StrapiItem): void {
    const mediaAttrs = getMediaAttributes(item);

    if (mediaAttrs) {
      // This item is itself a media item
      transformMediaItem(mediaAttrs);
    } else {
      // This item contains other fields that might be media
      for (const key of getItemKeys(item)) {
        const fieldValue = getFieldValue(item, key);
        transformValue(fieldValue);
      }
    }
  }

  /**
   * Recursively traverses and transforms media URLs in any value
   */
  function transformValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (isStrapiPrimitive(value)) {
      return value;
    }

    if (Array.isArray(value)) {
      value.forEach(transformValue);
      return value;
    }

    if (isStrapiItem(value)) {
      transformStrapiItem(value);
    } else if (typeof value === "object") {
      // Plain object - traverse its properties
      for (const key of Object.keys(value)) {
        transformValue(value[key]);
      }
    }

    return value;
  }

  return transformValue(data);
}
