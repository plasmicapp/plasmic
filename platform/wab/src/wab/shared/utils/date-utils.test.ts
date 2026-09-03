import {
  formatDateMediumTimeShort,
  formatDateShortTimeShort,
} from "@/wab/shared/utils/date-utils";

const TEST_DATE = new Date(2026, 11, 31, 23, 34, 45);

describe("date-utils.spec.ts", () => {
  it("runs in en-US locale", () => {
    expect(new Intl.DateTimeFormat().resolvedOptions().locale).toEqual("en-US");
  });
});

describe("formatDateMediumTimeShort", () => {
  it("formats date with medium date and short time", () => {
    expect(formatDateMediumTimeShort(TEST_DATE)).toEqual(
      "Dec 31, 2026, 11:34 PM"
    );
  });
});

describe("formatDateShortTimeShort", () => {
  it("formats date with short date and short time", () => {
    expect(formatDateShortTimeShort(TEST_DATE)).toEqual("12/31/26, 11:34 PM");
  });
});
