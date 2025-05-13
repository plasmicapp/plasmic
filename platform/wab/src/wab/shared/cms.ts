import { ApiCmsTable, CmsMetaType, CmsRowData } from "@/wab/shared/ApiSchema";

export function getDefaultLocale(data: CmsRowData) {
  return data[""];
}

export const ALLOWED_UNIQUE_TYPES = [
  CmsMetaType.BOOLEAN,
  CmsMetaType.NUMBER,
  CmsMetaType.TEXT,
  CmsMetaType.LONG_TEXT,
  CmsMetaType.REF,
  CmsMetaType.ENUM,
] as const;

/** Returns data for unique fields that need to be checked. */
export function getUniqueFieldsData(table: ApiCmsTable, data: CmsRowData) {
  const uniques = new Set(
    table.schema.fields.filter((f) => f.unique).map((f) => f.identifier)
  );
  return Object.fromEntries(
    Object.entries(getDefaultLocale(data)).filter(
      ([fieldIdentifier, value]) =>
        needsChecking(value) && uniques.has(fieldIdentifier)
    )
  );
}

/** Returns data for unique fields that are null and don't need to be checked. */
export function getNullUniqueFieldsData(table: ApiCmsTable, data: CmsRowData) {
  const uniques = new Set(
    table.schema.fields.filter((f) => f.unique).map((f) => f.identifier)
  );
  const defaultLocaleData = getDefaultLocale(data);
  return Object.fromEntries(
    Object.entries(getDefaultLocale(data)).filter(
      ([_fieldIdentifier, value]) => !needsChecking(value)
    )
  );
}

function needsChecking(value: unknown) {
  return value !== null && value !== undefined;
}
