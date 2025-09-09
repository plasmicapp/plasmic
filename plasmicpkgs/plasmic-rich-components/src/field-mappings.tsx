import { QueryResult, TableSchema } from "@plasmicapp/data-sources";
import { ComponentContextConfig } from "@plasmicapp/host";
import { PropType } from "@plasmicapp/host/registerComponent";
import deepGet from "lodash/get";
import { isOneOf, withoutFalsey } from "./utils";

export interface AutoSettings {
  dataType: "auto";
}

interface _SharedNumberSettings {
  notation?: "standard" | "scientific" | "engineering" | "compact";
  signDisplay?: "auto" | "always" | "exceptZero";
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  locale?: string;
}
export interface DecimalSettings extends _SharedNumberSettings {
  dataType: "number";
}
export interface PercentSettings extends _SharedNumberSettings {
  dataType: "percent";
}
export interface CurrencySettings extends _SharedNumberSettings {
  dataType: "currency";
  currency?: string;
  currencyDisplay?: "symbol" | "narrowSymbol" | "code" | "name";
}
export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  dataType: "currency",
  currency: "USD",
  currencyDisplay: "narrowSymbol",
};

export type NumberSettings =
  | DecimalSettings
  | PercentSettings
  | CurrencySettings;
export const NUMBER_TYPES = ["number", "percent", "currency"] as const;

export interface DateTimeSettings {
  dataType: "datetime";
  locale?: string;
  dateStyle?: "none" | "full" | "long" | "medium" | "short";
  timeStyle?: "none" | "full" | "long" | "medium" | "short";
  hour12?: boolean;
  timeZone?: string;
}
export const DEFAULT_DATETIME_SETTINGS: DateTimeSettings = {
  dataType: "datetime",
  locale: "en-US",
  dateStyle: "short",
  timeStyle: "short",
  hour12: true,
};

export interface RelativeDateTimeSettings {
  dataType: "relative-datetime";
  locale?: string;
  numeric?: "always" | "auto";
  style?: "long" | "short" | "narrow";
  unit?: "year" | "month" | "week" | "day" | "hour" | "minute" | "second";
}
export const DEFAULT_RELATIVE_DATETIME_SETTINGS: RelativeDateTimeSettings = {
  dataType: "relative-datetime",
  locale: "en-US",
  numeric: "always",
  style: "long",
  unit: "day",
};
export const DATETIME_TYPES = ["datetime", "relative-datetime"] as const;

export interface BooleanSettings {
  dataType: "boolean";
  showAs?: "text" | "checkbox" | "switch";
}
export const DEFAULT_BOOLEAN_SETTINGS: BooleanSettings = {
  dataType: "boolean",
  showAs: "checkbox",
};

export interface StringSettings {
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
    | DateTimeSettings
    | RelativeDateTimeSettings
  );

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

// Hacky "unique" string values
export const NoneField = "||NoneField||";
export const CustomField = "";

interface FieldSubpropsOpts<ColumnConfig extends BaseColumnConfig> {
  fieldTypes?: Record<string, PropType<any>>;
  canChangeField?: boolean;
  canPickNoneField?: boolean;
  noTitle?: boolean;
  noDataType?: boolean;
  hiddenFieldId?: (
    ps: Record<string, unknown>,
    ctx: ControlContextData<ColumnConfig>,
    extras: { path: (string | number)[] }
  ) => boolean;
}

export function getFieldSubprops<ColumnConfig extends BaseColumnConfig>(
  opts: FieldSubpropsOpts<ColumnConfig>
): Record<string, PropType<any>> {
  return {
    key: {
      type: "string",
      hidden: () => true,
    },
    fieldId: {
      type: "choice",
      displayName: "Field name",
      readOnly: !opts.canChangeField,
      options: (_props, ctx: ControlContextData<BaseColumnConfig>) =>
        withoutFalsey([
          opts.canPickNoneField && { value: NoneField, label: "None" },
          ...(ctx?.schema?.fields ?? []).map((f) => ({
            value: f.id,
            label: f.label ?? f.id,
          })),
          { value: CustomField, label: "Custom value" },
        ]),
      hidden: (
        ps,
        ctx: ControlContextData<ColumnConfig>,
        { path: _controlPath }
      ) => {
        // If this is change-able.
        if (opts.canChangeField) {
          return false;
        }
        return true;
        // If there's a user-set fieldId
        if (deepGet(ps, _controlPath)) {
          return false;
        }
        return opts.hiddenFieldId?.(ps, ctx, { path: _controlPath }) ?? true;
      },
    },
    title: {
      type: "string",
      displayName: "Title",
      defaultValueHint: getDefaultValueHint("title"),
      hidden: () => !!opts.noTitle,
    },
    expr: {
      ...rowDataType("Custom value"),
      hidden: (
        _ps,
        _ctx: ControlContextData<BaseColumnConfig>,
        { item, path: _controlPath }
      ) => {
        return false;
        // HIDE if this is unset.
        if (!item) {
          return true;
        }
        // SHOW if this is change-able *and* user chose "Custom".
        if (opts.canChangeField) {
          return false;
        }
        return true;
      },
    },
    isHidden: {
      type: "boolean",
      displayName: "Is hidden",
      defaultValueHint: getDefaultValueHint("isHidden"),
    },
    ...(!opts.noDataType
      ? {
          dataType: {
            type: "choice",
            displayName: "Data type",
            options: [
              {
                value: "auto",
                label: "Auto",
              },
              {
                value: "number",
                label: "Number",
              },
              {
                value: "percent",
                label: "Percentage",
              },
              {
                value: "currency",
                label: "Currency",
              },
              {
                value: "string",
                label: "String",
              },
              {
                value: "boolean",
                label: "Boolean",
              },
              {
                value: "datetime",
                label: "Date / Time",
              },
              {
                value: "relative-datetime",
                label: "Date / Time relative to now",
              },
            ],
            defaultValueHint: getDefaultValueHint("dataType"),
          },
          currency: {
            displayName: "Currency",
            description: "Must be a valid currency code",
            type: "string",
            defaultValueHint: "USD",
            hidden: (_ps, _ctx, { item }) => item.dataType !== "currency",
          },
          locale: {
            displayName: "Locale",
            description: "Must be a valid locale code",
            type: "string",
            defaultValueHint: "en-US",
            hidden: (_ps, _ctx, { item }) =>
              !isOneOf(item.dataType, NUMBER_TYPES) &&
              !isOneOf(item.dataType, DATETIME_TYPES),
          },
          notation: {
            displayName: "Notation",
            type: "choice",
            options: [
              {
                value: "standard",
                label: "Standard",
              },
              {
                value: "scientific",
                label: "Scientific notation (like 1E3)",
              },
              {
                value: "compact",
                label: "Compact (like 10K)",
              },
            ],
            defaultValueHint: "standard",
            hidden: (_ps, _ctx, { item }) =>
              !isOneOf(item.dataType, NUMBER_TYPES),
          },
          signDisplay: {
            type: "choice",
            displayName: "Number sign",
            options: [
              {
                value: "auto",
                label: "Only for negative numbers (10, -10)",
              },
              {
                value: "exceptZero",
                label: "Positive or negative (+10, -10)",
              },
            ],
            defaultValueHint: "auto",
            hidden: (_ps, _ctx, { item }) =>
              !isOneOf(item.dataType, NUMBER_TYPES),
          },
          maximumFractionDigits: {
            type: "number",
            displayName: "Max decimal places",
            defaultValueHint: 3,
            min: 0,
            max: 20,
            hidden: (_ps, _ctx, { item }) =>
              !isOneOf(item.dataType, NUMBER_TYPES),
          },
          minimumFractionDigits: {
            type: "number",
            displayName: "Min decimal places",
            defaultValueHint: 0,
            min: 0,
            max: 20,
            hidden: (_ps, _ctx, { item }) =>
              !isOneOf(item.dataType, NUMBER_TYPES),
          },
          showAs: {
            type: "choice",
            options: [
              {
                value: "checkbox",
                label: "Checkboxes",
              },
              {
                value: "switch",
                label: "Toggle switches",
              },
              {
                value: "text",
                label: "Text",
              },
            ],
            displayName: "Show as",
            defaultValueHint: "checkbox",
            hidden: (_ps, _ctx, { item }) => item.dataType !== "boolean",
          },
          dateStyle: {
            displayName: "Date style",
            type: "choice",
            options: [
              {
                value: "none",
                label: "None (don't display date)",
              },
              {
                value: "short",
                label: "Short (like 12/25/2023)",
              },
              {
                value: "medium",
                label: "Medium (like Dec 25, 2023)",
              },
              {
                value: "long",
                label: "Long (like December 25, 2023)",
              },
              {
                value: "full",
                label: "Full (like Monday, December 25, 2023)",
              },
            ],
            defaultValueHint: DEFAULT_DATETIME_SETTINGS.dateStyle,
            hidden: (_ps, _ctx, { item }) => item.dataType !== "datetime",
          },
          timeStyle: {
            displayName: "Time style",
            type: "choice",
            options: [
              {
                value: "none",
                label: "None (don't display time)",
              },
              {
                value: "short",
                label: "Short (like 4:00 PM)",
              },
              {
                value: "medium",
                label: "Medium (like 4:00:00 PM)",
              },
              {
                value: "long",
                label: "Long (like 4:00:00 PM PST)",
              },
              {
                value: "full",
                label: "Full (like 4:00:00 PM Pacific Standard Time)",
              },
            ],
            defaultValueHint: DEFAULT_DATETIME_SETTINGS.timeStyle,
            hidden: (_ps, _ctx, { item }) => item.dataType !== "datetime",
          },
          hour12: {
            displayName: "Use AM/PM?",
            description: "Whether to use AM/PM or 24-hour clock",
            type: "boolean",
            defaultValueHint: DEFAULT_DATETIME_SETTINGS.hour12,
            hidden: (_ps, _ctx, { item }) => item.dataType !== "datetime",
          },
          numeric: {
            type: "choice",
            displayName: "Use numbers?",
            options: [
              { value: "always", label: "Always use numbers" },
              {
                value: "auto",
                label: "Use words like 'Yesterday' or 'Tomorrow'",
              },
            ],
            defaultValueHint: DEFAULT_RELATIVE_DATETIME_SETTINGS.numeric,
            hidden: (_ps, _ctx, { item }) =>
              item.dataType !== "relative-datetime",
          },
          unit: {
            type: "choice",
            displayName: "Time unit",
            options: [
              {
                value: "second",
                label: "Seconds",
              },
              {
                value: "minute",
                label: "Minutes",
              },
              {
                value: "hour",
                label: "Hours",
              },
              {
                value: "day",
                label: "Days",
              },
              {
                value: "week",
                label: "Weeks",
              },
              {
                value: "month",
                label: "Months",
              },
              {
                value: "year",
                label: "Years",
              },
            ],
            defaultValueHint: DEFAULT_RELATIVE_DATETIME_SETTINGS.unit,
            hidden: (_ps, _ctx, { item }) =>
              item.dataType !== "relative-datetime",
          },
        }
      : {}),
    ...opts.fieldTypes,
  };
}

function getDefaultValueHint<ColumnConfig extends BaseColumnConfig>(
  field: keyof ColumnConfig
) {
  return (
    _props: any,
    contextData: ControlContextData<ColumnConfig> | null,
    { item }: any
  ): any => {
    if (item?.fieldId) {
      const fieldSetting = contextData?.mergedFields.find(
        (f) => f.fieldId === item.fieldId
      );
      return fieldSetting?.[field];
    }
    return undefined;
  };
}

const rowDataType = (displayName: string, control?: any) =>
  ({
    type: "function" as any,
    displayName,
    control,
    argNames: ["currentItem", "currentValue"],
    argValues: (_props: any, ctx: any, { item }: any) => {
      const row = ctx?.data?.[0];
      const cell = item.fieldId ? row?.[item.fieldId] : undefined;
      return [row, cell];
    },
  } as any);

export function buildFieldsPropType<
  ColumnConfig extends BaseColumnConfig,
  Props extends FieldfulProps<ColumnConfig>
>({
  advanced,
  displayName,
  minimalValue = (_props, contextData) => contextData?.minimalFullLengthFields,
  ...opts
}: {
  advanced?: boolean;
  displayName?: string;
  minimalValue?: ComponentContextConfig<Props, any>;
} & FieldSubpropsOpts<ColumnConfig>): PropType<Props> {
  return {
    type: "array",
    advanced,
    displayName,
    hidden: (ps) => !ps.data,
    unstable__keyFunc: (x) => x.key,
    unstable__minimalValue: minimalValue,
    unstable__canDelete: (_ps, _props, ctx, { item }) => {
      if (opts.canChangeField) {
        return true;
      }
      if (!ctx?.schema) {
        // still loading...
        return false;
      }
      if (
        item.fieldId &&
        ctx.schema.fields.some((f) => f.id === item.fieldId)
      ) {
        return false;
      }
      return true;
    },
    itemType: {
      type: "object",
      nameFunc: (_item: any) => {
        // Prefer to show the field ID when available, since there's no other indication what field you're edtiing if you relabeled it.
        return _item.fieldId || _item.title || "Custom value";
      },
      fields: getFieldSubprops(opts),
    },
  };
}
