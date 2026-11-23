import {
  PG_INTEGER_MAX,
  PG_INTEGER_MIN,
  isPgInteger,
} from "@/wab/shared/utils/pg-utils";

describe("isPgInteger", () => {
  it("accepts integers in range", () => {
    expect(isPgInteger(0)).toBe(true);
    expect(isPgInteger(-1)).toBe(true);
    expect(isPgInteger(PG_INTEGER_MIN)).toBe(true);
    expect(isPgInteger(PG_INTEGER_MAX)).toBe(true);
  });

  it("rejects integers out of range", () => {
    expect(isPgInteger(PG_INTEGER_MIN - 1)).toBe(false);
    expect(isPgInteger(PG_INTEGER_MAX + 1)).toBe(false);
  });

  it("rejects non-integers", () => {
    expect(isPgInteger(1.5)).toBe(false);
    expect(isPgInteger(NaN)).toBe(false);
    expect(isPgInteger(Infinity)).toBe(false);
    expect(isPgInteger("1")).toBe(false);
    expect(isPgInteger(null)).toBe(false);
    expect(isPgInteger(undefined)).toBe(false);
  });
});
