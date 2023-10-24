import { ApiCmsTable, CmsFieldMeta, CmsType } from "./schema";

type ValueLabelPair = {
  value: string;
  label: string;
};

export function mkTableOptions(
  tables: ApiCmsTable[] | undefined
): ValueLabelPair[] {
  if (!tables) {
    return [];
  }

  return tables.map((table) => ({
    value: table.identifier,
    label: table.name,
  }));
}

function addNestedFieldOptions(fields: CmsFieldMeta[], prefix = "") {
  const options: { value: string; label: any }[] = [];
  fields.forEach((field: any) => {
    const fieldPath = prefix + field.identifier;

    if (field.type !== "object") {
      options.push({
        value: fieldPath,
        label: field.name || fieldPath,
      });
    }

    if (field.type === "object" && field.fields) {
      const nestedOptions = addNestedFieldOptions(
        field.fields,
        fieldPath + "."
      );
      options.push(...nestedOptions);
    }
  });
  return options;
}

export function mkFieldOptions(
  tables: ApiCmsTable[] | undefined,
  tableIdentifier: string | undefined,
  types?: CmsType[]
): ValueLabelPair[] {
  if (!tables) {
    return [];
  }

  const table = tables.find((t) => t.identifier === tableIdentifier);
  if (!table) {
    return [];
  }

  let fields = table.schema.fields;
  if (types) {
    fields = fields.filter((f) => types.includes(f.type));
  }

  const options = addNestedFieldOptions(fields);

  if (!options.some((option) => option.value === "_id")) {
    options.push({
      label: "System-assigned ID",
      value: "_id",
    });
  }

  return options;
}
export function deepClone(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item: any) => deepClone(item));
  }

  const clonedObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }

  return clonedObj;
}