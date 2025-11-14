import { checkAllowedUnits } from "@/wab/shared/css/css-tree-utils";
import { LengthUnit } from "@/wab/shared/css/types";

describe("checkAllowedUnits", () => {
  it("should return true for allowed units", () => {
    expect(checkAllowedUnits("10px", ["px"])).toBe(true);
    expect(checkAllowedUnits("2em", ["em"])).toBe(true);
    expect(checkAllowedUnits("50vw", ["vw"])).toBe(true);
    expect(checkAllowedUnits("1cm", ["cm"])).toBe(true);
  });

  it("should return false for disallowed units", () => {
    expect(checkAllowedUnits("10px", ["em"])).toBe(false);
    expect(checkAllowedUnits("50vw", ["px", "em"])).toBe(false);
  });

  it("should handle multiple allowed units", () => {
    expect(checkAllowedUnits("10px", ["px", "em", "rem"])).toBe(true);
    expect(checkAllowedUnits("2em", ["px", "em", "rem"])).toBe(true);
  });

  it("should reject percentage when not in allowed units", () => {
    expect(checkAllowedUnits("50%", ["px"])).toBe(false);
  });

  it("should reject unitless numbers", () => {
    expect(checkAllowedUnits("0", [] as LengthUnit[])).toBe(false);
    expect(checkAllowedUnits("1.5", ["px"])).toBe(false);
  });

  it("should validate all values in space-separated list", () => {
    expect(checkAllowedUnits("10px 20px 30px 40px", ["px"])).toBe(true);
    expect(checkAllowedUnits("10px 2rem", ["px", "rem"])).toBe(true);
  });

  it("should return false if any value has disallowed unit", () => {
    expect(checkAllowedUnits("10px 20em", ["px"])).toBe(false);
    expect(checkAllowedUnits("1em 2em 3em 4rem", ["em"])).toBe(false);
  });

  it("should validate calc(), min(), max(), clamp() with allowed units", () => {
    expect(checkAllowedUnits("calc(100px - 20px)", ["px"])).toBe(true);
    expect(checkAllowedUnits("min(100px, 200px)", ["px"])).toBe(true);
    expect(checkAllowedUnits("max(10em, 5rem)", ["em", "rem"])).toBe(true);
    expect(checkAllowedUnits("clamp(10px, 50px, 100px)", ["px"])).toBe(true);
  });

  it("should reject functions with disallowed units", () => {
    expect(checkAllowedUnits("calc(100px - 20em)", ["px"])).toBe(false);
    expect(checkAllowedUnits("min(100px, 50vw)", ["px"])).toBe(false);
    expect(checkAllowedUnits("clamp(10px, 50vw, 100px)", ["px"])).toBe(false);
  });

  it("should handle nested functions", () => {
    expect(checkAllowedUnits("calc(min(100px, 50px) + 10px)", ["px"])).toBe(
      true
    );
    expect(checkAllowedUnits("calc(min(100px, 50vw) + 10px)", ["px"])).toBe(
      false
    );
  });

  it("should handle negative and decimal values", () => {
    expect(checkAllowedUnits("-10px", ["px"])).toBe(true);
    expect(checkAllowedUnits("0.5px", ["px"])).toBe(true);
    expect(checkAllowedUnits(".75em", ["em"])).toBe(true);
  });

  it("should reject uppercase units", () => {
    expect(checkAllowedUnits("10PX", ["px"])).toBe(false);
    expect(checkAllowedUnits("10px", ["px"])).toBe(true);
  });

  it("should handle empty allowed units array", () => {
    expect(checkAllowedUnits("10px", [] as LengthUnit[])).toBe(false);
  });
});
