import {
  checkAllowedUnits,
  formatDimCssFunction,
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

describe("formatDimCssFunction", () => {
  it("should add spaces around + operator", () => {
    expect(formatDimCssFunction("calc(100%+20px)")).toBe("calc(100% + 20px)");
    expect(formatDimCssFunction("calc(50px+10px)")).toBe("calc(50px + 10px)");
  });

  it("should add spaces around - operator", () => {
    expect(formatDimCssFunction("calc(100%-20px)")).toBe("calc(100% - 20px)");
    expect(formatDimCssFunction("calc(50px-10px)")).toBe("calc(50px - 10px)");
  });

  it("should add spaces around * operator", () => {
    expect(formatDimCssFunction("calc(100%*0.5)")).toBe("calc(100% * 0.5)");
    expect(formatDimCssFunction("calc(50px*2)")).toBe("calc(50px * 2)");
    expect(formatDimCssFunction("calc(20px*20)")).toBe("calc(20px * 20)");
  });

  it("should add spaces around / operator", () => {
    expect(formatDimCssFunction("calc(100%/2)")).toBe("calc(100% / 2)");
    expect(formatDimCssFunction("calc(50px/10)")).toBe("calc(50px / 10)");
  });

  it("should handle multiple operators", () => {
    expect(formatDimCssFunction("calc(100%-20px+5%)")).toBe(
      "calc(100% - 20px + 5%)"
    );
    expect(formatDimCssFunction("calc(100%*0.5+20px)")).toBe(
      "calc(100% * 0.5 + 20px)"
    );
    expect(formatDimCssFunction("calc(100%-20px*2/4)")).toBe(
      "calc(100% - 20px * 2 / 4)"
    );
  });

  it("should normalize already spaced expressions", () => {
    expect(formatDimCssFunction("calc(100%  -  20px)")).toBe(
      "calc(100% - 20px)"
    );
    expect(formatDimCssFunction("calc(100%   +   20px)")).toBe(
      "calc(100% + 20px)"
    );
  });

  it("should handle expressions with one side already spaced", () => {
    expect(formatDimCssFunction("calc(100% -20px)")).toBe("calc(100% - 20px)");
    expect(formatDimCssFunction("calc(100%-20px )")).toBe("calc(100% - 20px)");
  });

  it("should format min() function", () => {
    expect(formatDimCssFunction("min(100%-20px,400px)")).toBe(
      "min(100% - 20px, 400px)"
    );
    expect(formatDimCssFunction("min(50vw*2,100%)")).toBe(
      "min(50vw * 2, 100%)"
    );
  });

  it("should format max() function", () => {
    expect(formatDimCssFunction("max(100%+20px,400px)")).toBe(
      "max(100% + 20px, 400px)"
    );
    expect(formatDimCssFunction("max(50vw/2,100px)")).toBe(
      "max(50vw / 2, 100px)"
    );
  });

  it("should format clamp() function", () => {
    expect(formatDimCssFunction("clamp(10px,50%+10px,100px)")).toBe(
      "clamp(10px, 50% + 10px, 100px)"
    );
    expect(formatDimCssFunction("clamp(10px,100%-20px,500px)")).toBe(
      "clamp(10px, 100% - 20px, 500px)"
    );
  });

  it("should handle nested functions", () => {
    expect(formatDimCssFunction("calc(min(100%-20px,50px)+10px)")).toBe(
      "calc(min(100% - 20px, 50px) + 10px)"
    );
    expect(formatDimCssFunction("calc(max(100px,50%)*2)")).toBe(
      "calc(max(100px, 50%) * 2)"
    );
  });

  it("should handle negative numbers", () => {
    expect(formatDimCssFunction("calc(100%+-20px)")).toBe("calc(100% + -20px)");
    expect(formatDimCssFunction("calc(-100%+20px)")).toBe("calc(-100% + 20px)");
  });

  it("should handle decimal numbers", () => {
    expect(formatDimCssFunction("calc(100%*0.5)")).toBe("calc(100% * 0.5)");
    expect(formatDimCssFunction("calc(100%/1.5)")).toBe("calc(100% / 1.5)");
  });

  it("should handle unitless numbers", () => {
    expect(formatDimCssFunction("calc(100%*2)")).toBe("calc(100% * 2)");
    expect(formatDimCssFunction("calc(50px/3)")).toBe("calc(50px / 3)");
  });

  it("should not modify non-dimension functions", () => {
    expect(formatDimCssFunction("rgb(255,0,0)")).toBe("rgb(255,0,0)");
    expect(formatDimCssFunction("var(--my-var)")).toBe("var(--my-var)");
    expect(formatDimCssFunction("linear-gradient(red,blue)")).toBe(
      "linear-gradient(red,blue)"
    );
  });

  it("should handle var() inside calc without breaking var names", () => {
    expect(formatDimCssFunction("calc(100%-var(--spacing))")).toBe(
      "calc(100% - var(--spacing))"
    );
    expect(formatDimCssFunction("calc(var(--width)+20px)")).toBe(
      "calc(var(--width) + 20px)"
    );
    expect(formatDimCssFunction("calc(100%-var(--my-value)*2)")).toBe(
      "calc(100% - var(--my-value) * 2)"
    );
  });

  it("should not modify simple values without functions", () => {
    expect(formatDimCssFunction("100px")).toBe("100px");
    expect(formatDimCssFunction("50%")).toBe("50%");
    expect(formatDimCssFunction("10")).toBe("10");
  });

  it("should handle deeply nested functions", () => {
    expect(formatDimCssFunction("calc(100% - calc(50%+10px))")).toBe(
      "calc(100% - calc(50% + 10px))"
    );
    expect(formatDimCssFunction("calc(min(100%-20px,max(50px,30px)))")).toBe(
      "calc(min(100% - 20px, max(50px, 30px)))"
    );
  });

  it("should handle grouping parentheses", () => {
    expect(formatDimCssFunction("calc((100%-20px)/2)")).toBe(
      "calc((100% - 20px) / 2)"
    );
    expect(formatDimCssFunction("calc(((100%+50px)*2)/4)")).toBe(
      "calc(((100% + 50px) * 2) / 4)"
    );
  });

  it("should not format non-dimension functions (slash ambiguity safe)", () => {
    expect(formatDimCssFunction("16px/1.5")).toBe("16px/1.5");
    expect(formatDimCssFunction("font: 16px/1.5")).toBe("font: 16px/1.5");
  });

  it("should normalize excessive whitespace", () => {
    expect(formatDimCssFunction("calc(10px   +    5px)")).toBe(
      "calc(10px + 5px)"
    );
    expect(formatDimCssFunction("calc(100%     -     20px)")).toBe(
      "calc(100% - 20px)"
    );
  });

  it("should handle zero values", () => {
    expect(formatDimCssFunction("calc(100%-0px)")).toBe("calc(100% - 0px)");
    expect(formatDimCssFunction("calc(0+10px)")).toBe("calc(0 + 10px)");
    expect(formatDimCssFunction("max(0,10px)")).toBe("max(0, 10px)");
  });

  it("should handle all four operators in one expression", () => {
    expect(formatDimCssFunction("calc(100%/2-10px+5%*3)")).toBe(
      "calc(100% / 2 - 10px + 5% * 3)"
    );
  });

  it("should handle expressions with closing paren followed by operator", () => {
    expect(formatDimCssFunction("calc(min(100px,50px)+20px)")).toBe(
      "calc(min(100px, 50px) + 20px)"
    );
    expect(formatDimCssFunction("calc(max(10px,5px)*2)")).toBe(
      "calc(max(10px, 5px) * 2)"
    );
  });

  it("should handle multiple var() functions with operators", () => {
    expect(formatDimCssFunction("calc(var(--a)+var(--b))")).toBe(
      "calc(var(--a) + var(--b))"
    );
    expect(formatDimCssFunction("calc(var(--width)-var(--offset)*2)")).toBe(
      "calc(var(--width) - var(--offset) * 2)"
    );
  });

  it("should handle complex nested expressions", () => {
    expect(
      formatDimCssFunction("calc(100%-(min(50px,25%)+max(10px,5%)))")
    ).toBe("calc(100% - (min(50px, 25%) + max(10px, 5%)))");
  });

  it("should handle decimals starting with dot", () => {
    expect(formatDimCssFunction("calc(100%*.5)")).toBe("calc(100% * .5)");
    expect(formatDimCssFunction("calc(.75em+.25em)")).toBe(
      "calc(.75em + .25em)"
    );
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
