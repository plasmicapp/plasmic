import { ApiCmsTable, CmsMetaType, CmsRowData } from "@/wab/shared/ApiSchema";

export function getDefaultLocale(data: CmsRowData) {
  return data[""] || {}; // fallback to `{}` in case DB data is missing default locale
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
export function getUniqueFieldsData(
  table: ApiCmsTable,
  data: CmsRowData,
  opts?: { nulls: "only" }
) {
  const uniques = new Set(
    table.schema.fields.filter((f) => f.unique).map((f) => f.identifier)
  );
  return Object.fromEntries(
    Object.entries(getDefaultLocale(data)).filter(
      ([fieldIdentifier, value]) => {
        if (!uniques.has(fieldIdentifier)) {
          return false;
        }

        const isNull = value === null || value === undefined;
        if (opts?.nulls === "only") {
          return isNull;
        } else {
          return !isNull;
        }
      }
    )
  );
}
