import { CmsRowData } from "@/wab/shared/ApiSchema";

export function getDefaultLocale(data: CmsRowData) {
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
