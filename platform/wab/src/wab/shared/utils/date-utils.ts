const dateMediumTimeShort = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Formats a date with a medium date and short time (no seconds).
 *
 * Example output for 2026-12-31 23:34 by locale:
 * - en-US: "Dec 31, 2026, 11:34 PM"
 * - fr-FR: "31 déc. 2026, 23:34"
 * - ja-JP: "2026/12/31 23:34"
 * - ko-KR: "2026. 12. 31. 오후 11:34"
 * - pt-BR: "31 de dez. de 2026, 23:34"
 * - zh-CN: "2026年12月31日 23:34"
 */
export function formatDateMediumTimeShort(date: Date): string {
  return dateMediumTimeShort.format(date);
}

const dateShortTimeShort = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "short",
});

/**
 * Formats a date with a short date and short time (no seconds).
 *
 * Example output for 2026-12-31 23:34 by locale:
 * - en-US: "12/31/26, 11:34 PM"
 * - fr-FR: "31/12/2026 23:34"
 * - ja-JP: "2026/12/31 23:34"
 * - ko-KR: "26. 12. 31. 오후 11:34"
 * - pt-BR: "31/12/2026, 23:34"
 * - zh-CN: "2026/12/31 23:34"
 */
export function formatDateShortTimeShort(date: Date): string {
  return dateShortTimeShort.format(date);
}
