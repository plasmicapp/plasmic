import { useMemo } from "react";
import {
  ManyRowsResult,
  TableFieldSchema,
  TableFieldType,
  TableSchema,
} from "./types";
import { mkIdMap, withoutNils } from "./utils";

export type QueryResult = Partial<ManyRowsResult<any>> & {
  error?: any;
  isLoading?: boolean;
};

export interface NormalizedData {
  data: Record<string, unknown>[];
  schema?: TableSchema;
}

export function normalizeData(rawData: unknown): NormalizedData | undefined {
  if (!rawData) {
    return undefined;
  }

  const dataArray = tryGetDataArray(rawData);
  if (!dataArray) {
    return undefined;
  }
  const schema = (rawData as any).schema ?? tryGetSchema(dataArray);
  if (!schema) {
    return undefined;
  }
  return { data: dataArray, schema };
}

export function useNormalizedData(
  rawData: unknown
): NormalizedData | undefined {
  return useMemo(() => normalizeData(rawData), [rawData]);
}

function tryGetDataArray(rawData: unknown): any[] | undefined {
  if (rawData == null || typeof rawData !== "object") {
    return undefined;
  }

  if (Array.isArray(rawData)) {
    if (isArrayOfObjects(rawData)) {
      return rawData;
    } else {
      // TODO: array of primitives? Maybe we can wrap this?
      return undefined;
    }
  }

  if (rawData == null) {
    return undefined;
  }

  if ("data" in rawData && typeof (rawData as any).data === "object") {
    if (
      Array.isArray((rawData as any).data) &&
      isArrayOfObjects((rawData as any).data)
    ) {
      return (rawData as any).data;
    } else if ((rawData as any).data != null) {
      return [(rawData as any).data];
    } else {
      return undefined;
    }
  }
  if ("isLoading" in rawData || "error" in rawData) {
    return undefined;
  }

  // Maybe a singleton record?
  return [rawData];
}

function isArrayOfObjects(arr: unknown[]) {
  return arr.every((x) => typeof x === "object" && !Array.isArray(x));
}

function tryGetSchema(data: any[]): TableSchema | undefined {
  const fieldMap: Record<string, TableFieldType> = {};
  data.forEach((entry: any) => {
    if (entry && typeof entry === "object") {
      Array.from(Object.entries(entry)).forEach(([k, v]) => {
        const inferredType: TableFieldType =
          typeof v === "string"
            ? "string"
            : typeof v === "boolean"
            ? "boolean"
            : typeof v === "number"
            ? "number"
            : "unknown";
        if (fieldMap[k] && fieldMap[k] !== inferredType) {
          fieldMap[k] = "unknown";
        } else {
          fieldMap[k] = inferredType;
        }
      });
    }
  });
  return {
    id: "inferred",
    fields: Object.entries(fieldMap).map(([f, t]) => ({
      id: f,
      type: t,
      readOnly: false,
    })),
  };
}

export type BaseFieldConfig = {
  key?: string;
  fieldId?: string;
};

const mkShortId = () => `${Math.random()}`;

export function deriveFieldConfigs<T extends BaseFieldConfig>(
  specifiedFieldsPartial: Partial<T>[],
  schema: TableSchema | undefined,
  makeDefaultConfig: (field: TableFieldSchema | undefined) => T
): {
  mergedFields: T[];
  minimalFullLengthFields: Partial<T>[];
} {
  const schemaFields = schema?.fields ?? [];
  const fieldById = mkIdMap(schemaFields);
  const specifiedFieldIds = new Set(
    withoutNils(specifiedFieldsPartial.map((f) => f.fieldId))
  );
  const keptSpecifiedFields = specifiedFieldsPartial.flatMap((f): T[] => {
    if (!f.fieldId) {
      return [
        { key: mkShortId(), ...makeDefaultConfig(undefined), ...f },
      ] as T[];
    }
    const field = fieldById.get(f.fieldId as string);

    // Drop configs with fieldIds no longer in the data.
    if (!field) {
      return [];
    }

    return [
      {
        key: mkShortId(),
        ...makeDefaultConfig(field),
        ...f,
      },
    ] as T[];
  });
  const newVirtualFields = schemaFields
    .filter((f) => !specifiedFieldIds.has(f.id))
    .map(
      (f): T => ({
        key: mkShortId(),
        ...makeDefaultConfig(f),
      })
    );
  const mergedFields = [...keptSpecifiedFields, ...newVirtualFields];
  const minimalFullLengthFields: Partial<T>[] = [
    ...specifiedFieldsPartial,
    ...newVirtualFields.map((f) => ({ key: f.key, fieldId: f.fieldId })),
  ] as Partial<T>[];
  return { mergedFields, minimalFullLengthFields };
}
