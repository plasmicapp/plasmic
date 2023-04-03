import { TableFieldSchema, TableSchema } from "@plasmicapp/data-sources";

export const tuple = <T extends any[]>(...args: T): T => args;

export interface HasId {
  id: string;
}

export function mkIdMap<T extends HasId>(xs: ReadonlyArray<T>): Map<string, T> {
  return new Map(xs.map((x) => tuple(x.id, x) as [string, T]));
}

export const mkShortId = () => `${Math.random()}`;

export const withoutNils = <T>(xs: Array<T | undefined | null>): T[] =>
  xs.filter((x): x is T => x != null);

interface AutoSettings {
  dataType: "auto";
}

interface NumberSettings {
  dataType: "number";
  decimalPlacesExpr: RowFunc<number>;
  showThousandsSeparator: boolean;
}

interface BooleanSettings {
  dataType: "boolean";
  showFalseAs: "empty" | "dash" | "cross";
}

interface StringSettings {
  dataType: "string";
}

interface StyleConfig {
  styles: {};
  align: "left" | "center" | "right";
  freeze: "off" | "left" | "right";
}

type RowFunc<Result> = (row: Record<string, unknown>) => Result;

/**
 * Exprs are for things that can must re-evaluate from row to row.
 *
 * Literal values are for things that are column-level. (But in Plasmic Studio, as with all props, you can still use a dynamic value.)
 */
export type ColumnConfig = {
  key: string;
  fieldId?: string;
  title?: string;
  expr?: RowFunc<any>;
  isEditableExpr: RowFunc<boolean>;
  disableSorting: boolean;
  sortByExpr?: RowFunc<any>;
  isHidden: boolean;
  formatting: StyleConfig;
} & (AutoSettings | NumberSettings | StringSettings | BooleanSettings);

export type PartialColumnConfig = Omit<Partial<ColumnConfig>, "key"> & {
  key: string;
};

const defaultColumnConfig = (): ColumnConfig =>
  ({
    key: mkShortId(),
    isEditableExpr: () => false,
    disableSorting: false,
    sortByExpr: undefined,
    isHidden: false,
    formatting: {
      styles: {},
      align: "left",
      freeze: "off",
    },
    dataType: "auto" as "auto",
  } as const);

export function deriveFieldConfigs(
  specifiedFieldsPartial: PartialColumnConfig[],
  schema: TableSchema | undefined
): {
  mergedFields: ColumnConfig[];
  minimalFullLengthFields: PartialColumnConfig[];
} {
  // Ugly: when adding a new item to an array from Plasmic Studio UI, no way to specify default values for the new item,
  // so we have to do it here. The only one we need is the random key.
  for (const field of specifiedFieldsPartial) {
    if (!field.key) {
      field.key = mkShortId();
    }
  }

  const schemaFields = schema?.fields ?? [];
  const fieldById = mkIdMap(schemaFields);
  const specifiedFieldIds = new Set(
    withoutNils(specifiedFieldsPartial.map((f) => f.fieldId))
  );
  function defaultColumnConfigForField(field: TableFieldSchema): ColumnConfig {
    return {
      ...defaultColumnConfig(),
      fieldId: field.id,
      title: field.label || field.id,
      expr: (currentItem) => currentItem[field.id],
    };
  }
  const keptSpecifiedFields = specifiedFieldsPartial.flatMap(
    (f): ColumnConfig[] => {
      const fieldId = f.fieldId;
      if (!fieldId) {
        return [{ ...defaultColumnConfig(), ...f }] as ColumnConfig[];
      }
      const field = fieldById.get(fieldId);

      // Drop configs with fieldIds no longer in the data.
      if (!field) {
        return [];
      }

      return [
        {
          ...defaultColumnConfigForField(field),
          ...f,
        },
      ] as ColumnConfig[];
    }
  );
  const newVirtualFields = schemaFields
    .filter((f) => !specifiedFieldIds.has(f.id))
    .map(
      (f): ColumnConfig => ({
        ...defaultColumnConfigForField(f),
      })
    );
  const mergedFields = [...keptSpecifiedFields, ...newVirtualFields];
  const minimalFullLengthFields: PartialColumnConfig[] = [
    ...specifiedFieldsPartial,
    ...newVirtualFields.map((f) => ({ key: f.key, fieldId: f.fieldId })),
  ];
  return { mergedFields, minimalFullLengthFields };
}
