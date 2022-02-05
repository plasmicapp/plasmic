import { ApiCmsTable } from "./schema";

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
  tableId: string | undefined
): ValueLabelPair[] {
  if (!tables) {
    return [];
  }

  const table = tables.find((t) => t.identifier === tableId);
  if (!table) {
    return [];
  }

  return table.schema.fields.map((f) => ({
    value: f.identifier,
    label: f.name || f.identifier,
  }));
}
