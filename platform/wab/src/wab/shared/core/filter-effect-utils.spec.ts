import { fromFilterStringToObj } from "@/wab/shared/core/filter-effect-utils";

const defaultFilterEffects = {
  blur: {
    type: "blur",
    args: ["0px"],
    visible: true,
  },
};

describe("fromFilterStringToObj", () => {
  it("should return default blur effect when input does not match the FILTER_PATTERN", () => {
    const result = fromFilterStringToObj("invalid-filter-string");
    expect(result).toEqual(defaultFilterEffects.blur);
  });

  it("should parse a valid filter string with visible property", () => {
    const result = fromFilterStringToObj("blur(10px)");
    expect(result).toEqual({
      type: "blur",
      args: ["10px"],
      visible: true,
    });
  });

  it("should parse a valid filter string with hidden# prefix", () => {
    const result = fromFilterStringToObj("hidden#blur(10px)");
    expect(result).toEqual({
      type: "blur",
      args: ["10px"],
      visible: false,
    });
  });

  it("should parse a filter string with multiple arguments", () => {
    const result = fromFilterStringToObj("drop-shadow(10px 10px 5px #000000)");
    expect(result).toEqual({
      type: "drop-shadow",
      args: ["10px", "10px", "5px", "#000000"],
      visible: true,
    });
  });

  it("should parse a filter string with hidden# and multiple arguments", () => {
    const result = fromFilterStringToObj(
      "hidden#drop-shadow(10px 10px 5px #000000)"
    );
    expect(result).toEqual({
      type: "drop-shadow",
      args: ["10px", "10px", "5px", "#000000"],
      visible: false,
    });
  });

  it("should parse a filter string with CSS variable as an argument", () => {
    const result = fromFilterStringToObj(
      "drop-shadow(10px 10px 10px var(--token-color))"
    );
    expect(result).toEqual({
      type: "drop-shadow",
      args: ["10px", "10px", "10px", "var(--token-color)"],
      visible: true,
    });
  });

  it("should handle multiple valid filter strings gracefully", () => {
    const result = fromFilterStringToObj("brightness(150%) hue-rotate(90deg)");
    expect(result).toEqual({
      type: "brightness",
      args: ["150%"],
      visible: true,
    });
  });
});
