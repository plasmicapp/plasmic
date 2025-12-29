import {
  ApiCmsTable,
  CmsFieldMeta,
  CmsList,
  CmsMetaType,
  CmsObject,
  CmsType,
} from "./schema";

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
  types?: CmsType[],
  opts?: {
    includeSystemId?: boolean;
    includeRefStars?: boolean;
  }
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

  const options = [
    // single fields
    ...fields.map((f) => ({
      value: f.identifier,
      label: f.label || f.identifier,
    })),

    // ref star fields
    ...(opts?.includeRefStars ? mkRefStarFieldOptions([], fields) : []),
  ];

  options.sort((a, b) => a.label.localeCompare(b.label));

  if (
    opts?.includeSystemId &&
    !options.some((option) => option.value === "_id")
  ) {
    options.push({
      label: "System ID",
      value: "_id",
    });
  }

  return options;
}

function mkRefStarFieldOptions(
  fieldPath: (CmsList | CmsObject)[],
  nextFields: CmsFieldMeta[]
): ValueLabelPair[] {
  return nextFields.flatMap((nestedField) => {
    if (nestedField.type === CmsMetaType.REF) {
      const fieldPathToRef = [...fieldPath, nestedField];
      return [
        {
          value: fieldPathToRef.map((f) => f.identifier).join(".") + ".*",
          label:
            fieldPathToRef.map((f) => f.label || f.identifier).join(".") + ".*",
        },
      ];
    } else if (
      nestedField.type === CmsMetaType.LIST ||
      nestedField.type === CmsMetaType.OBJECT
    ) {
      return mkRefStarFieldOptions(
        [...fieldPath, nestedField],
        nestedField.fields
      );
    } else {
      return [];
    }
  });
}
