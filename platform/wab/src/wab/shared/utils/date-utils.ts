import { Temporal } from "temporal-polyfill";

export type ExactTime = Temporal.Instant | Temporal.ZonedDateTime;

export function toInstant(value: ExactTime | Date | string): Temporal.Instant {
  if (value instanceof Temporal.Instant) {
    return value;
  } else if (value instanceof Temporal.ZonedDateTime) {
    return value.toInstant();
  } else if (value instanceof Date) {
    return Temporal.Instant.fromEpochMilliseconds(value.getTime());
  } else {
    return Temporal.Instant.from(value);
  }
}

export function localTimeZone(): string {
  return Temporal.Now.timeZoneId();
}

/** The zone if zoned, otherwise the local time zone. */
export function displayTimeZone(value: ExactTime): string {
  return value instanceof Temporal.ZonedDateTime
    ? value.timeZoneId
    : localTimeZone();
}

/** Make a formatter. Cached per time zone for performance. */
function mkDateTimeFormat(options: Intl.DateTimeFormatOptions) {
  const formatsByTimeZone = new Map<string, Intl.DateTimeFormat>();
  return (timeZone: string): Intl.DateTimeFormat => {
    let format = formatsByTimeZone.get(timeZone);
    if (!format) {
      format = new Intl.DateTimeFormat(undefined, { ...options, timeZone });
      formatsByTimeZone.set(timeZone, format);
    }
    return format;
  };
}

const dateMediumTimeShortFormat = mkDateTimeFormat({
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Formats an exact time with a medium date and short time (no seconds).
 *
 * Example output for 2026-12-31 23:34 by locale:
 * - en-US: "Dec 31, 2026, 11:34 PM"
 * - fr-FR: "31 déc. 2026, 23:34"
 * - ja-JP: "2026/12/31 23:34"
 * - ko-KR: "2026. 12. 31. 오후 11:34"
 * - pt-BR: "31 de dez. de 2026, 23:34"
 * - zh-CN: "2026年12月31日 23:34"
 */
export function formatDateMediumTimeShort(
  value: ExactTime,
  timeZone = displayTimeZone(value),
): string {
  return dateMediumTimeShortFormat(timeZone).format(value.epochMilliseconds);
}

const dateFullTimeShortFormat = mkDateTimeFormat({
  dateStyle: "full",
  timeStyle: "short",
});

/**
 * Formats an exact time with a full date (including weekday) and short time
 * (no seconds).
 *
 * Example output for 2026-12-31 23:34 by locale:
 * - en-US: "Thursday, December 31, 2026 at 11:34 PM"
 * - fr-FR: "jeudi 31 décembre 2026 à 23:34"
 * - ja-JP: "2026年12月31日木曜日 23:34"
 * - ko-KR: "2026년 12월 31일 목요일 오후 11:34"
 * - pt-BR: "quinta-feira, 31 de dezembro de 2026 às 23:34"
 * - zh-CN: "2026年12月31日星期四 23:34"
 */
export function formatDateFullTimeShort(
  value: ExactTime,
  timeZone = displayTimeZone(value),
): string {
  return dateFullTimeShortFormat(timeZone).format(value.epochMilliseconds);
}

const dateShortTimeShortFormat = mkDateTimeFormat({
  dateStyle: "short",
  timeStyle: "short",
});

/**
 * Formats an exact time with a short date and short time (no seconds).
 *
 * Example output for 2026-12-31 23:34 by locale:
 * - en-US: "12/31/26, 11:34 PM"
 * - fr-FR: "31/12/2026 23:34"
 * - ja-JP: "2026/12/31 23:34"
 * - ko-KR: "26. 12. 31. 오후 11:34"
 * - pt-BR: "31/12/2026, 23:34"
 * - zh-CN: "2026/12/31 23:34"
 */
export function formatDateShortTimeShort(
  value: ExactTime,
  timeZone = displayTimeZone(value),
): string {
  return dateShortTimeShortFormat(timeZone).format(value.epochMilliseconds);
}

const zoneShortFormat = mkDateTimeFormat({ timeZoneName: "short" });

/**
 * Formats the zoned time's zone. Note the date matters!
 *
 * Example output for 2026-12-31 23:34 in America/Los_Angeles by locale:
 * - en-US: "PST"
 * - fr-FR: "UTC−8"
 * - ja-JP: "GMT-8"
 */
export function formatZoneShort(value: Temporal.ZonedDateTime): string {
  const parts = zoneShortFormat(value.timeZoneId).formatToParts(
    value.epochMilliseconds,
  );
  return (
    parts.find((part) => part.type === "timeZoneName")?.value ??
    value.timeZoneId
  );
}

const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

/** Largest first. Valid as both Temporal and Intl.RelativeTimeFormat units. */
const RELATIVE_TIME_UNITS = [
  "year",
  "month",
  "week",
  "day",
  "hour",
  "minute",
  "second",
] as const;

/**
 * Formats an exact time relative to the current time.
 *
 * Example output in en-US: "now", "5 minutes ago", "yesterday", "in 3 days".
 */
export function formatRelative(
  value: ExactTime,
  now: Temporal.ZonedDateTime = Temporal.Now.zonedDateTimeISO(),
): string {
  const duration = toInstant(value).since(now.toInstant());

  // Find first significant time unit.
  const unit =
    RELATIVE_TIME_UNITS.find(
      (u) => Math.abs(duration.total({ unit: u, relativeTo: now })) >= 1,
    ) ?? "second";
  return relativeTimeFormat.format(
    Math.trunc(duration.total({ unit, relativeTo: now })),
    unit,
  );
}
