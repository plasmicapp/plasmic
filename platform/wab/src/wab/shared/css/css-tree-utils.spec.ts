import {
  checkAllowedUnits,
  validateDimCssFunction,
} from "@/wab/shared/css/css-tree-utils";
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

describe("validateDimCssFunction", () => {
  it("should accept all valid dimension functions (calc, min, max, clamp)", () => {
    expect(validateDimCssFunction("calc(100px - 20px)")).toEqual({
      valid: true,
    });
    expect(validateDimCssFunction("min(100px, 50%)")).toEqual({ valid: true });
    expect(validateDimCssFunction("max(10em, 5rem)")).toEqual({ valid: true });
    expect(validateDimCssFunction("clamp(10px, 50%, 100px)")).toEqual({
      valid: true,
    });
  });

  it("should allow unitless numbers in calc without allowedUnits", () => {
    expect(validateDimCssFunction("calc(20px * 2)")).toEqual({ valid: true });
    expect(validateDimCssFunction("calc(100px / 4)")).toEqual({ valid: true });
    expect(validateDimCssFunction("calc(50% * 1.5)")).toEqual({ valid: true });
  });

  it("should allow unitless numbers in calc with allowedUnits", () => {
    expect(validateDimCssFunction("calc(20px * 2)", ["px"])).toEqual({
      valid: true,
    });
    expect(validateDimCssFunction("calc(100px / 4)", ["px"])).toEqual({
      valid: true,
    });
  });

  it("should reject invalid units when allowedUnits is provided", () => {
    const result = validateDimCssFunction("calc(20px + 10em)", ["px"]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("em");
      expect(result.error).toContain("isn't supported here");
    }
  });

  it("should reject invalid identifiers/keywords", () => {
    const result = validateDimCssFunction("calc(invalidKeyword + 10px)");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("invalidKeyword");
      expect(result.error).toContain("isn't a valid keyword");
    }
  });

  it("should reject non-dimension functions (rgb, var, custom)", () => {
    const result1 = validateDimCssFunction("rgb(255, 0, 0)");
    expect(result1.valid).toBe(false);
    if (!result1.valid) {
      expect(result1.error).toContain("Not a valid CSS dimension function");
    }

    const result2 = validateDimCssFunction("customFunc(100px)");
    expect(result2.valid).toBe(false);
    if (!result2.valid) {
      expect(result2.error).toContain("Not a valid CSS dimension function");
    }
  });
});
