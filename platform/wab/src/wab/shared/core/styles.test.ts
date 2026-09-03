import { preferShorthand } from "@/wab/shared/core/styles";

describe("preferShorthand", () => {
  it("should output shorthand notation", () => {
    const input = new Map<string, string>([
      ["border-top-left-radius", "3px"],
      ["border-top-right-radius", "3px"],
      ["border-bottom-left-radius", "3px"],
      ["border-bottom-right-radius", "3px"],
    ]);
    const expected = new Map<string, string>([["border-radius", "3px"]]);
    expect(preferShorthand(input)).toEqual(expected);
  });
  it("should output shorthand notation", () => {
    const input = new Map<string, string>([
      ["padding-top", "25px"],
      ["padding-right", "50px"],
      ["padding-bottom", "25px"],
      ["padding-left", "50px"],
    ]);
    const expected = new Map<string, string>([["padding", "25px 50px"]]);
    expect(preferShorthand(input)).toEqual(expected);
  });
  it("should output shorthand notation", () => {
    const input = new Map<string, string>([
      ["padding-top", "25px"],
      ["padding-right", "50px"],
      ["padding-bottom", "75px"],
      ["padding-left", "50px"],
    ]);
    const expected = new Map<string, string>([["padding", "25px 50px 75px"]]);
    expect(preferShorthand(input)).toEqual(expected);
  });
  it("should output shorthand notation", () => {
    const input = new Map<string, string>([
      ["margin-top", "25px"],
      ["margin-right", "50px"],
      ["margin-bottom", "75px"],
      ["margin-left", "100px"],
    ]);
    const expected = new Map<string, string>([
      ["margin", "25px 50px 75px 100px"],
    ]);
    expect(preferShorthand(input)).toEqual(expected);
  });
  it("should output shorthand notation", () => {
    const input = new Map<string, string>([
      ["border-left-width", "1px"],
      ["border-left-style", "solid"],
      ["border-left-color", "red"],
    ]);
    const expected = new Map<string, string>([
      ["border-left", "1px solid red"],
    ]);
    expect(preferShorthand(input)).toEqual(expected);
  });
  it("should output shorthand notation", () => {
    const input = new Map<string, string>([
      ["border-left-width", "1px"],
      ["border-left-style", "solid"],
      ["border-left-color", "red"],
      ["border-right-width", "1px"],
      ["border-right-style", "solid"],
      ["border-right-color", "red"],
      ["border-top-width", "1px"],
      ["border-top-style", "solid"],
      ["border-top-color", "red"],
      ["border-bottom-width", "1px"],
      ["border-bottom-style", "solid"],
      ["border-bottom-color", "red"],
    ]);
    const expected = new Map<string, string>([["border", "1px solid red"]]);
    expect(preferShorthand(input)).toEqual(expected);
  });
  it("should output shorthand notation", () => {
    const input = new Map<string, string>([
      ["border-left-width", "1px"],
      ["border-right-width", "1px"],
      ["border-top-width", "1px"],
      ["border-bottom-width", "1px"],
    ]);
    const expected = new Map<string, string>([["border-width", "1px"]]);
    expect(preferShorthand(input)).toEqual(expected);
  });
});
