import { ApiCmsTable, CmsType } from "./schema";

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
  const options = fields.map((f) => ({
    value: f.identifier,
    label: f.label || f.identifier,
  }));
  if (!options.some((option) => option.value === "_id")) {
    options.push({
      label: "System ID",
      value: "_id",
    });
  }

  return options;
}
