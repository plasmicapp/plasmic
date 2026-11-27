import {
  displayTimeZone,
  formatDateFullTimeShort,
  formatDateMediumTimeShort,
  formatDateShortTimeShort,
  formatRelative,
  formatZoneShort,
  localTimeZone,
  toInstant,
} from "@/wab/shared/utils/date-utils";
import { Temporal } from "temporal-polyfill";

const TEST_ZONED = Temporal.ZonedDateTime.from(
  "2026-12-31T23:34:45-08:00[America/Los_Angeles]",
);
const TEST_INSTANT = Temporal.Instant.from("2027-01-01T07:34:45Z");

describe("date-utils.spec.ts", () => {
  it("runs in en-US locale", () => {
    expect(new Intl.DateTimeFormat().resolvedOptions().locale).toEqual("en-US");
  });
});

describe("toInstant", () => {
  it("converts every supported input to the same instant", () => {
    expect(toInstant(TEST_INSTANT).equals(TEST_INSTANT)).toBe(true);
    expect(toInstant(TEST_ZONED).equals(TEST_INSTANT)).toBe(true);
    expect(
      toInstant(new Date("2027-01-01T07:34:45Z")).equals(TEST_INSTANT),
    ).toBe(true);
    expect(toInstant("2027-01-01T07:34:45.000Z").equals(TEST_INSTANT)).toBe(
      true,
    );
    expect(toInstant("2026-12-31T23:34:45-08:00").equals(TEST_INSTANT)).toBe(
      true,
    );
  });

  it("throws on a string without an offset", () => {
    expect(() => toInstant("2026-12-31T23:34:45")).toThrow();
  });
});

describe("displayTimeZone", () => {
  it("uses a ZonedDateTime's own zone", () => {
    expect(displayTimeZone(TEST_ZONED)).toEqual("America/Los_Angeles");
  });

  it("uses the viewer's zone for an Instant", () => {
    expect(displayTimeZone(TEST_INSTANT)).toEqual(localTimeZone());
  });
});

describe("formatDateMediumTimeShort", () => {
  it("formats a ZonedDateTime in its own zone", () => {
    expect(formatDateMediumTimeShort(TEST_ZONED)).toEqual(
      "Dec 31, 2026, 11:34 PM",
    );
  });

  it("formats in the given zone", () => {
    expect(formatDateMediumTimeShort(TEST_ZONED, "UTC")).toEqual(
      "Jan 1, 2027, 7:34 AM",
    );
    expect(formatDateMediumTimeShort(TEST_INSTANT, "Asia/Tokyo")).toEqual(
      "Jan 1, 2027, 4:34 PM",
    );
  });

  it("formats an Instant in the viewer's zone", () => {
    expect(formatDateMediumTimeShort(TEST_INSTANT)).toEqual(
      formatDateMediumTimeShort(
        TEST_INSTANT.toZonedDateTimeISO(localTimeZone()),
      ),
    );
  });
});

describe("formatDateShortTimeShort", () => {
  it("formats date with short date and short time", () => {
    expect(formatDateShortTimeShort(TEST_ZONED)).toEqual("12/31/26, 11:34 PM");
  });
});

describe("formatDateFullTimeShort", () => {
  it("formats date with full date and short time", () => {
    expect(formatDateFullTimeShort(TEST_ZONED)).toEqual(
      "Thursday, December 31, 2026 at 11:34 PM",
    );
    expect(formatDateFullTimeShort(TEST_ZONED, "UTC")).toEqual(
      "Friday, January 1, 2027 at 7:34 AM",
    );
  });
});

describe("formatZoneShort", () => {
  it("formats only the short zone name", () => {
    expect(formatZoneShort(TEST_ZONED)).toEqual("PST");
    expect(formatZoneShort(TEST_ZONED.withTimeZone("UTC"))).toEqual("UTC");
    expect(formatZoneShort(TEST_ZONED.withTimeZone("Asia/Tokyo"))).toEqual(
      "GMT+9",
    );
  });

  it("reflects daylight saving time at the value's moment", () => {
    expect(
      formatZoneShort(
        Temporal.ZonedDateTime.from("2026-07-01T12:00[America/Los_Angeles]"),
      ),
    ).toEqual("PDT");
  });
});

describe("formatRelative", () => {
  const now = TEST_ZONED;
  const ago = (duration: Temporal.DurationLike) =>
    formatRelative(now.subtract(duration), now);
  const fromNow = (duration: Temporal.DurationLike) =>
    formatRelative(now.add(duration), now);

  it("formats past times in the largest whole unit", () => {
    expect(ago({ milliseconds: 0 })).toEqual("now");
    expect(ago({ milliseconds: 400 })).toEqual("now");
    expect(ago({ seconds: 30 })).toEqual("30 seconds ago");
    expect(ago({ minutes: 1 })).toEqual("1 minute ago");
    expect(ago({ minutes: 5 })).toEqual("5 minutes ago");
    expect(ago({ hours: 3 })).toEqual("3 hours ago");
    expect(ago({ hours: 24 })).toEqual("yesterday");
    expect(ago({ days: 3 })).toEqual("3 days ago");
    expect(ago({ weeks: 1 })).toEqual("last week");
    expect(ago({ months: 2 })).toEqual("2 months ago");
    expect(ago({ years: 2 })).toEqual("2 years ago");
  });

  it("truncates to whole units elapsed", () => {
    expect(ago({ seconds: 119 })).toEqual("1 minute ago");
    expect(ago({ hours: 47 })).toEqual("yesterday");
    expect(fromNow({ seconds: 119 })).toEqual("in 1 minute");
  });

  it("counts calendar months", () => {
    // Dec 31 back to Nov 1 is 60 days, but not yet 2 months
    expect(ago({ days: 60 })).toEqual("last month");
    expect(ago({ days: 61 })).toEqual("2 months ago");
  });

  it("formats future times", () => {
    expect(fromNow({ seconds: 30 })).toEqual("in 30 seconds");
    expect(fromNow({ minutes: 5 })).toEqual("in 5 minutes");
    expect(fromNow({ hours: 24 })).toEqual("tomorrow");
  });

  it("accepts a value with a different calendar", () => {
    const value = now.subtract({ hours: 2 }).withCalendar("gregory");
    expect(formatRelative(value, now)).toEqual("2 hours ago");
  });

  it("accepts an Instant", () => {
    expect(formatRelative(TEST_INSTANT.subtract({ hours: 2 }), now)).toEqual(
      "2 hours ago",
    );
  });
});
