import { CmsRowData } from "@/wab/shared/ApiSchema";
import { Dict } from "@/wab/shared/collections";

type CmsLocaleRowData = Dict<unknown>;

export function getDefaultLocale(data: CmsRowData): CmsLocaleRowData {
  return data[""];
}

export function getUniqueFieldsData(
  uniqueFieldsIdentifier: string[],
  data: CmsRowData
) {
  /** Unique fields should only work on default locale. */
  const defaultLocaleData = getDefaultLocale(data);
  return Object.fromEntries(
    Object.entries(defaultLocaleData).filter(([fieldIdentifier, _]) =>
      uniqueFieldsIdentifier.includes(fieldIdentifier)
    )
  );
}
