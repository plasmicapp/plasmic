import React from "react";
import { Checkbox, Switch } from "antd";
import {
  BaseColumnConfig,
  BooleanSettings,
  DEFAULT_BOOLEAN_SETTINGS,
  DEFAULT_DATETIME_SETTINGS,
  DEFAULT_CURRENCY_SETTINGS,
  DateTimeSettings,
  NUMBER_TYPES,
  NumberSettings,
  RelativeDateTimeSettings,
  DEFAULT_RELATIVE_DATETIME_SETTINGS,
  DATETIME_TYPES,
} from "./field-mappings";
import { isOneOf } from "./utils";

export function renderValue(
  value: any,
  record: any,
  cconfig: BaseColumnConfig
) {
  if (cconfig.expr) {
    value = cconfig.expr(record, value);
  }

  if (value == null) {
    return "";
  }

  if (cconfig.dataType === "auto") {
    return renderAuto(value);
  } else {
    const coerced = coerceValue(value, cconfig.dataType);
    if (
      isOneOf(cconfig.dataType, NUMBER_TYPES) &&
      typeof coerced === "number"
    ) {
      return renderNumber(coerced, cconfig as NumberSettings);
    } else if (cconfig.dataType === "boolean" && typeof coerced === "boolean") {
      return renderBoolean(coerced, cconfig);
    } else if (cconfig.dataType === "datetime" && coerced instanceof Date) {
      return renderDate(coerced, cconfig);
    } else if (
      cconfig.dataType === "relative-datetime" &&
      coerced instanceof Date
    ) {
      return renderRelativeDate(coerced, cconfig);
    }
    return asString(value);
  }
}

function renderAuto(value: unknown): React.ReactNode {
  if (typeof value === "number") {
    return renderNumber(value, { dataType: "number" });
  } else if (typeof value === "boolean") {
    return renderBoolean(value, DEFAULT_BOOLEAN_SETTINGS);
  } else if (value instanceof Date) {
    return renderDate(value, DEFAULT_DATETIME_SETTINGS);
  } else {
    const coerced = tryCoerceAuto(value);
    if (coerced === CANNOT_COERCE) {
      return asString(value);
    } else {
      return renderAuto(coerced);
    }
  }
}

function tryCoerceAuto(value: unknown) {
  for (const dataType of [
    "number",
    "datetime",
  ] as BaseColumnConfig["dataType"][]) {
    const coerced = coerceValue(value, dataType);
    if (coerced !== CANNOT_COERCE) {
      return coerced;
    }
  }
  return CANNOT_COERCE;
}

function renderNumber(value: number, cconfig: NumberSettings) {
  if (cconfig.dataType === "number") {
    return new Intl.NumberFormat(cconfig.locale, cconfig).format(value);
  } else if (cconfig.dataType === "percent") {
    return new Intl.NumberFormat(cconfig.locale, {
      ...cconfig,
      style: "percent",
    }).format(value);
  } else if (cconfig.dataType === "currency") {
    return new Intl.NumberFormat(cconfig.locale, {
      ...DEFAULT_CURRENCY_SETTINGS,
      ...cconfig,
      style: "currency",
    }).format(value);
  } else {
    throw new Error(`Unexpected dataType ${(cconfig as any).dataType}`);
  }
}

function renderDate(value: Date, cconfig: DateTimeSettings) {
  const opts = {
    ...DEFAULT_DATETIME_SETTINGS,
    ...cconfig,
  };
  if (opts.dateStyle === "none") {
    delete opts["dateStyle"];
  }
  if (opts.timeStyle === "none") {
    delete opts["timeStyle"];
  }
  return new Intl.DateTimeFormat(cconfig.locale, opts as any).format(value);
}

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const UNIT_TO_MS = {
  second: SECOND_MS,
  minute: MINUTE_MS,
  hour: HOUR_MS,
  day: DAY_MS,
  week: WEEK_MS,
} as const;
const UNITS_BY_MS = Object.keys(UNIT_TO_MS) as (keyof typeof UNIT_TO_MS)[];

function renderRelativeDate(value: Date, cconfig: RelativeDateTimeSettings) {
  const opts = {
    ...DEFAULT_RELATIVE_DATETIME_SETTINGS,
    ...cconfig,
  };
  const unit = cconfig.unit ?? "day";
  const formatter = new Intl.RelativeTimeFormat(cconfig.locale, opts);
  if (isOneOf(unit, UNITS_BY_MS)) {
    // for "exact" units, we can do it by just calcluating the difference
    // by ms
    const diff = value.getTime() - new Date().getTime();
    return formatter.format(Math.round(diff / UNIT_TO_MS[unit]), unit);
  } else {
    // otherwise we need to calculate by the specific unit
    if (unit === "year") {
      const diff = value.getFullYear() - new Date().getFullYear();
      return formatter.format(diff, unit);
    } else if (unit === "month") {
      const months = (d: Date) => d.getFullYear() * 12 + d.getMonth() + 1;
      const diff = months(value) - months(new Date());
      return formatter.format(diff, unit);
    } else {
      throw new Error(`Unexpected relative time unit ${unit}`);
    }
  }
}

function renderBoolean(value: boolean, cconfig: BooleanSettings) {
  const showAs = cconfig.showAs ?? DEFAULT_BOOLEAN_SETTINGS.showAs;
  if (showAs === "checkbox") {
    return <Checkbox checked={value} />;
  } else if (showAs === "switch") {
    return <Switch checked={value} />;
  } else {
    return value ? "true" : "false";
  }
}

const CANNOT_COERCE = Symbol("plasmic-cannot-coerce");
function coerceValue(value: unknown, dataType: BaseColumnConfig["dataType"]) {
  if (value == null) {
    return null;
  }
  try {
    if (isOneOf(dataType, NUMBER_TYPES)) {
      if (typeof value === "number") {
        return value;
      } else if (typeof value === "string") {
        const maybeNumber = +value;
        if (!isNaN(maybeNumber)) {
          return maybeNumber;
        }
      }
    } else if (isOneOf(dataType, DATETIME_TYPES)) {
      if (value instanceof Date) {
        return value;
      } else if (typeof value === "number") {
        return new Date(value);
      } else if (typeof value === "string") {
        const maybeDate = new Date(value);
        if (!isNaN(maybeDate.getTime())) {
          return maybeDate;
        }
      }
    } else if (dataType === "boolean") {
      if (value === true || value === false) {
        return value;
      } else if (typeof value === "number") {
        return value !== 0;
      } else if (typeof value === "string") {
        return value.toLowerCase() === "true";
      }
    } else if (dataType === "string") {
      return asString(value);
    } else if (dataType === "auto") {
      return value;
    }
  } catch (err) {
    // Ignore error; just fail to coerce
  }

  return CANNOT_COERCE;
}

function asString(value: unknown) {
  if (value == null) {
    return "";
  } else if (typeof value === "string") {
    return value;
  } else if (typeof value === "object") {
    if ("toString" in value && typeof value.toString === "function") {
      return value.toString();
    } else {
      return JSON.stringify(value);
    }
  } else {
    return `${value}`;
  }
}
