import React from "react";
import { TableFieldSchema, TableSchema } from "@plasmicapp/data-sources";
import { Checkbox, Switch } from "antd";
import { ControlExtras, PropType } from "@plasmicapp/host/registerComponent";
import { QueryResult } from "./queries";
import { ensureNumber } from "./utils";

export const tuple = <T extends any[]>(...args: T): T => args;

export interface HasId {
  id: string;
}

export function mkIdMap<T extends HasId>(xs: ReadonlyArray<T>): Map<string, T> {
  return new Map(xs.map((x) => tuple(x.id, x) as [string, T]));
}

export const mkShortId = () => `${Math.random()}`;

function withoutNils<T>(xs: Array<T | undefined | null>): T[] {
  return xs.filter((x): x is T => x != null);
}

interface AutoSettings {
  dataType: "auto";
}

interface _SharedNumberSettings {
  notation?: "standard" | "scientific" | "engineering" | "compact";
  signDisplay?: "auto" | "always" | "exceptZero";
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  locale?: string;
}
interface NumberSettings extends _SharedNumberSettings {
  dataType: "number";
}
interface PercentSettings extends _SharedNumberSettings {
  dataType: "percent";
}
interface MoneySettings extends _SharedNumberSettings {
  dataType: "money";
  currency?: string;
}

interface BooleanSettings {
  dataType: "boolean";
  showAs?: "text" | "checkbox" | "switch";
}

interface StringSettings {
  dataType: "string";
}

export type RowFunc<Result> = (row: Record<string, unknown>) => Result;
export type CellFunc<Result> = (
  row: Record<string, unknown>,
  value: unknown
) => Result;

/**
 * Exprs are for things that can must re-evaluate from row to row.
 *
 * Literal values are for things that are column-level. (But in Plasmic Studio, as with all props, you can still use a dynamic value.)
 */

interface _BaseColumnConfig {
  key: string;
  fieldId?: string;
  title?: string;
  isHidden: boolean;
  expr?: CellFunc<any>;
}

export type BaseColumnConfig = _BaseColumnConfig &
  (
    | AutoSettings
    | NumberSettings
    | StringSettings
    | BooleanSettings
    | MoneySettings
    | PercentSettings
  );

export function deriveFieldConfigs<ColumnConfig extends BaseColumnConfig>(
  specifiedFieldsPartial: Partial<ColumnConfig>[],
  schema: TableSchema | undefined,
  makeDefaultConfig: (field: TableFieldSchema | undefined) => ColumnConfig
): {
  mergedFields: ColumnConfig[];
  minimalFullLengthFields: Partial<ColumnConfig>[];
} {
  const schemaFields = schema?.fields ?? [];
  const fieldById = mkIdMap(schemaFields);
  const specifiedFieldIds = new Set(
    withoutNils(specifiedFieldsPartial.map((f) => f.fieldId))
  );
  const keptSpecifiedFields = specifiedFieldsPartial.flatMap(
    (f, index): ColumnConfig[] => {
      const fieldId = f.fieldId;
      if (!fieldId) {
        return [
          { ...makeDefaultConfig(undefined), key: index, ...f },
        ] as ColumnConfig[];
      }
      const field = fieldById.get(fieldId);

      // Drop configs with fieldIds no longer in the data.
      if (!field) {
        return [];
      }

      return [
        {
          ...makeDefaultConfig(field),
          ...f,
        },
      ] as ColumnConfig[];
    }
  );
  const newVirtualFields = schemaFields
    .filter((f) => !specifiedFieldIds.has(f.id))
    .map(
      (f): ColumnConfig => ({
        ...makeDefaultConfig(f),
      })
    );
  const mergedFields = [...keptSpecifiedFields, ...newVirtualFields];
  const minimalFullLengthFields: Partial<ColumnConfig>[] = [
    ...specifiedFieldsPartial,
    ...newVirtualFields.map((f) => ({ key: f.key, fieldId: f.fieldId })),
  ] as Partial<ColumnConfig>[];
  return { mergedFields, minimalFullLengthFields };
}

export function deriveValueType(cconfig: BaseColumnConfig) {
  return cconfig.dataType === "auto"
    ? undefined
    : cconfig.dataType === "string"
    ? "text"
    : cconfig.dataType === "number"
    ? "digit"
    : cconfig.dataType === "boolean"
    ? "switch"
    : undefined;
}

/**
 * Render booleans, objects, arrays, etc. as JSON repr.
 */
export function renderValue(
  value: any,
  record: any,
  cconfig: BaseColumnConfig
) {
  if (cconfig.expr) {
    return cconfig.expr(record, value);
  }

  if (value == null) {
    return "";
  }

  if (cconfig.dataType === "string" || cconfig.dataType === "auto") {
    return `${value}`;
  } else if (cconfig.dataType === "number" && typeof value === "number") {
    return new Intl.NumberFormat(cconfig.locale, cconfig).format(value);
  } else if (cconfig.dataType === "percent" && typeof value === "number") {
    return new Intl.NumberFormat(cconfig.locale, {
      ...cconfig,
      style: "percent",
    }).format(value);
  } else if (cconfig.dataType === "money" && typeof value === "number") {
    return new Intl.NumberFormat(cconfig.locale, {
      ...cconfig,
      style: "currency",
    }).format(value);
  } else if (cconfig.dataType === "boolean") {
    const isTrue = !!value;
    if (cconfig.showAs === "checkbox") {
      return <Checkbox checked={isTrue} />;
    } else if (cconfig.showAs === "switch") {
      return <Switch checked={isTrue} />;
    } else {
      return isTrue ? "true" : "false";
    }
  } else {
    return typeof value === "string"
      ? value
      : typeof value === "number"
      ? value.toString()
      : JSON.stringify(value);
  }
}

export interface ControlContextData<ColumnConfig extends BaseColumnConfig> {
  data: unknown[];
  schema?: TableSchema;
  mergedFields: ColumnConfig[];
  minimalFullLengthFields: Partial<ColumnConfig>[];
}

export interface FieldfulProps<ColumnConfig extends BaseColumnConfig> {
  className?: string;
  data?: QueryResult;
  fields?: Partial<ColumnConfig>[];
  setControlContextData?: (ctx: ControlContextData<ColumnConfig>) => void;
}

export function buildFieldsPropType<
  ColumnConfig extends BaseColumnConfig,
  Props extends FieldfulProps<ColumnConfig>
>(opts: { fieldTypes?: Record<string, PropType<any>> }): PropType<Props> {
  function getDefaultValueHint(field: keyof ColumnConfig) {
    return (
      _props: Props,
      contextData: ControlContextData<ColumnConfig> | null,
      { path }: ControlExtras
    ): any => contextData?.mergedFields[ensureNumber(path.slice(-2)[0])][field];
  }

  const rowDataType = (displayName: string, control?: any) =>
    ({
      type: "function" as any,
      displayName,
      control,
      argNames: ["currentItem", "currentValue"],
      argValues: (_props: any, ctx: any) => {
        const row = ctx?.data?.[0];
        const cell = _props.fieldId ? row?.[_props.fieldId] : undefined;
        return [row, cell];
      },
    } as any);

  return {
    type: "array",
    hidden: (ps) => !ps.data,
    unstable__keyFunc: (x) => x.key,
    unstable__minimalValue: (_props, contextData) =>
      contextData?.minimalFullLengthFields,
    unstable__canDelete: (_item: any, _props, ctx, { path }) => {
      if (!ctx?.schema) {
        // still loading...
        return false;
      }
      if (
        _item.fieldId &&
        ctx.schema.fields.some((f) => f.id === _item.fieldId)
      ) {
        return false;
      }
      return true;
    },
    itemType: {
      type: "object",
      nameFunc: (_item: any, _props, ctx, { path }) => {
        return _item.title ?? _item.fieldId;
      },
      fields: {
        key: {
          type: "string",
          hidden: () => true,
        },
        fieldId: {
          type: "choice",
          displayName: "Field name",
          readOnly: true,
          options: (_props, ctx) =>
            (ctx?.schema?.fields ?? []).map((f) => f.id),
          hidden: (_props, ctx, { path: _controlPath }) =>
            !(_controlPath.slice(-1)[0] in (ctx?.schema?.fields ?? {})),
        },
        title: {
          type: "string",
          displayName: "Title",
          defaultValueHint: getDefaultValueHint("title"),
        },
        dataType: {
          type: "choice",
          displayName: "Data type",
          options: ["auto", "number", "string", "boolean"],
          defaultValueHint: getDefaultValueHint("dataType"),
        },
        expr: rowDataType("Customize data"),
        isHidden: {
          type: "boolean",
          displayName: "Is hidden",
          defaultValueHint: getDefaultValueHint("isHidden"),
        },
        ...opts.fieldTypes,
      },
    },
  };
}
