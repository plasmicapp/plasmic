import {
  ManyRowsResult,
  TableFieldType,
  TableSchema,
} from "@plasmicapp/data-sources";

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

function tryGetDataArray(rawData: unknown): any[] | undefined {
  if (!rawData || typeof rawData !== "object") {
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

  if ("data" in rawData && Array.isArray(rawData.data)) {
    if (isArrayOfObjects(rawData.data)) {
      return rawData.data;
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
