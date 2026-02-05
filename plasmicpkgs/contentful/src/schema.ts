import { BASE_URL } from "./utils";

export interface ContentTypeField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  localized: boolean;
  disabled: boolean;
}

export interface ContentTypeSchema {
  sys: { id: string };
  name: string;
  displayField?: string;
  fields: ContentTypeField[];
}

/**
 * Fetch all content types for a space/environment
 * Returns full schemas which can be used for both dropdown population and field discovery
 */
export async function fetchContentTypes(
  space: string,
  accessToken: string,
  environment: string = "master"
): Promise<ContentTypeSchema[]> {
  const url = `${BASE_URL}/spaces/${space}/environments/${environment}/content_types`;
  const params = new URLSearchParams({ access_token: accessToken });

  const resp = await fetch(`${url}?${params.toString()}`);

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch content types: ${resp.status} ${resp.statusText}`
    );
  }

  const data = await resp.json();
  return data.items;
}

/**
 * Helper to find a specific content type schema from a list
 */
export function findContentTypeSchema(
  contentType: string | undefined,
  contentTypes: ContentTypeSchema[] | undefined
): ContentTypeSchema | undefined {
  if (!contentType || !contentTypes) {
    return undefined;
  }
  return contentTypes.find((ct) => ct.sys.id === contentType);
}
