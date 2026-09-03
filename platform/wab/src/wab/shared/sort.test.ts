import { naturalSort } from "@/wab/shared/sort";
import { identity } from "lodash";

describe("naturalSort", () => {
  it("should return the original item", () => {
    const input = [{ name: "a" }, { name: "c" }, { name: "b" }];
    const expected = [{ name: "a" }, { name: "b" }, { name: "c" }];
    expect(naturalSort(input, (item) => item.name)).toEqual(expected);
  });

  it("should handle empty strings", () => {
    const input = ["a", "", "b", ""];
    const expected = ["", "", "a", "b"];
    expect(naturalSort(input, identity)).toEqual(expected);
  });

  it("should have the following ordering for each part: numbers, lowercase, uppercase", () => {
    const input = [
      "Comp2",
      "0comp",
      "comp2",
      "0Comp",
      "comp1",
      "comp",
      "Comp",
      "Comp1",
      "0",
    ];
    const expected = [
      "0",
      "0comp",
      "0Comp",
      "comp",
      "comp1",
      "comp2",
      "Comp",
      "Comp1",
      "Comp2",
    ];
    expect(naturalSort(input, identity)).toEqual(expected);
  });

  it("should sort padding tokens", () => {
    const input = [
      "Padding 16px",
      "Padding 8px",
      "Padding 4px",
      "Padding 32px",
    ];
    const expected = [
      "Padding 4px",
      "Padding 8px",
      "Padding 16px",
      "Padding 32px",
    ];
    expect(naturalSort(input, identity)).toEqual(expected);
  });

  it("should handle tokens with units in parentheses", () => {
    const input = [
      "32px (Margin)",
      "8px (Margin)",
      "16px (Margin)",
      "4px (Margin)",
    ];
    const expected = [
      "4px (Margin)",
      "8px (Margin)",
      "16px (Margin)",
      "32px (Margin)",
    ];
    expect(naturalSort(input, identity)).toEqual(expected);
  });

  it("should sort mixed unit tokens", () => {
    const input = [
      "Spacing 1rem",
      "Spacing 16px",
      "Spacing 0.5em",
      "Spacing 8px",
    ];
    const expected = [
      "Spacing 0.5em",
      "Spacing 1rem",
      "Spacing 8px",
      "Spacing 16px",
    ];
    expect(naturalSort(input, identity)).toEqual(expected);
  });

  it("should handle tokens with decimal values", () => {
    const input = ["Border 0.5px", "Border 2px", "Border 1.5px", "Border 1px"];
    const expected = [
      "Border 0.5px",
      "Border 1px",
      "Border 1.5px",
      "Border 2px",
    ];
    expect(naturalSort(input, identity)).toEqual(expected);
  });

  it("should sort tokens with different prefixes", () => {
    const input = [
      "Padding Bottom 8px",
      "Margin Top 16px",
      "Padding Top 8px",
      "Margin Bottom 16px",
    ];
    const expected = [
      "Margin Bottom 16px",
      "Margin Top 16px",
      "Padding Bottom 8px",
      "Padding Top 8px",
    ];
    expect(naturalSort(input, identity)).toEqual(expected);
  });

  it("should handle tokens with non-numeric parts", () => {
    const input = [
      "Font Size Large",
      "Font Size Small",
      "Font Size Medium",
      "Font Size X-Large",
    ];
    const expected = [
      "Font Size Large",
      "Font Size Medium",
      "Font Size Small",
      "Font Size X-Large",
    ];
    expect(naturalSort(input, identity)).toEqual(expected);
  });

  it("should sort tokens with mixed formats", () => {
    const input = [
      "16px (Padding)",
      "Margin 8px",
      "1rem (Font Size)",
      "Border Radius 4px",
      "Padding 8px",
      "Font Size 14px",
      "Margin 16px",
      "Border Radius 8px",
      "999999999px",
    ];
    const expected = [
      "1rem (Font Size)",
      "16px (Padding)",
      "999999999px",
      "Border Radius 4px",
      "Border Radius 8px",
      "Font Size 14px",
      "Margin 8px",
      "Margin 16px",
      "Padding 8px",
    ];
    expect(naturalSort(input, identity)).toEqual(expected);
  });
});
