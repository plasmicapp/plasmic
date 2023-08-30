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
import { isOneOf, maybe, parseDate } from "./utils";

export function maybeRenderValue(
  record: any,
  cconfig: BaseColumnConfig | undefined
) {
  return cconfig ? renderValue(record, cconfig) : undefined;
}

export function multiRenderValue(
  record: any,
  cconfigs: BaseColumnConfig[] | undefined
) {
  return cconfigs
    ?.flatMap((cc) =>
      cc.isHidden ? [] : [` • `, <>{renderValue(record, cc)}</>]
    )
    .slice(1);
}

export function maybeRenderString(
  record: any,
  cconfig: BaseColumnConfig | undefined
) {
  return cconfig && !cconfig.isHidden
    ? maybe(getFieldValue(record, cconfig), asString)
    : undefined;
}

function getFieldValue(record: any, cconfig: BaseColumnConfig) {
  let value = cconfig.fieldId ? record[cconfig.fieldId] : undefined;

  if (cconfig.expr) {
    value = cconfig.expr(record, value);
  }

  return value;
}

export function getFieldAggregateValue(
  record: any,
  cconfigs: BaseColumnConfig[] | undefined,
  separator = ", "
) {
  if (!cconfigs?.length) return undefined;

  return cconfigs?.length
    ? cconfigs.map((item) => getFieldValue(record, item)).join(separator)
    : undefined;
}

export function renderValue(record: any, cconfig: BaseColumnConfig) {
  const value = getFieldValue(record, cconfig);

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
        // We don't want to simply use Date because it's too loose and varies across platforms.
        // It'll parse even things like "42" and "iPhone 8" as dates!
        //
        // After a bunch of research, I couldn't find a great simple way to recognize a bunch of common date formats.
        // Closest such resource I could find was this list of formats:
        // https://gist.github.com/brandonjp/ac259099ba95868c4826fc0f58f9e7b4
        // But for now it's probably better to stick to one of the "standard" computer formats rather than try to recognize various "humanized" date time formats.
        // We could try to expand this in the future.
        //
        // As far as libraries go:
        // dayjs has very buggy and long-neglected support for parsing.
        // Temporal doesn't handle general parsing by format.
        // Luxon is maintained and decent, though it doesn't accept a whole list of formats.
        //
        // Right now we also don't know anything about performance.
        const parsed = parseDate(value);
        if (parsed) {
          return parsed.toJSDate();
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
