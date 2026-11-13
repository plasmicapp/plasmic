import {
  parseComponentProps,
  parseGlobalVariants,
} from "@/wab/server/loader/parse-query-params";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";

describe.each([
  ["globalVariants", parseGlobalVariants],
  ["componentProps", parseComponentProps],
] as const)("%s", (name, parse) => {
  it("returns undefined when missing or empty", () => {
    expect(parse(undefined)).toBeUndefined();
    expect(parse("")).toBeUndefined();
  });

  it.each(
    ["undefined", "{foo}", "null", "1", '"str"', ["duplicate", "params"]].map(
      (raw) => ({ raw }),
    ),
  )("rejects invalid JSON, shapes, or query types: %j", ({ raw }) => {
    expect(() => parse(raw)).toThrow(
      expect.objectContaining({
        name: "BadRequestError",
        message: `Invalid ${name} value`,
      }),
    );
  });
});

describe("parseGlobalVariants", () => {
  it("parses global variants with optional project IDs", () => {
    const variants = [
      { name: "Theme", value: "dark" },
      { name: "Locale", projectId: "abc", value: "en" },
    ];
    expect(parseGlobalVariants(JSON.stringify(variants))).toEqual(variants);
    expect(parseGlobalVariants("[]")).toEqual([]);
  });

  it.each(
    [false, true, 0, 1, "", [], ["compact"], ["compact", "highContrast"]].map(
      (value) => ({
        value,
      }),
    ),
  )("accepts scalar or multi-select value $value", ({ value }) => {
    const variants = [{ name: "Theme", value }];
    expect(parseGlobalVariants(JSON.stringify(variants))).toEqual(variants);
  });

  it.each([
    { name: "Theme" },
    { value: "dark" },
    { name: "", value: "dark" },
    { name: "Theme", projectId: 1, value: "dark" },
    { name: "Theme", value: null },
    { name: "Theme", value: {} },
    { name: "Theme", value: ["dark", 1] },
    { name: "Theme", value: [null] },
    { name: "Theme", value: [["dark"]] },
    null,
  ])("rejects invalid entry %j", (entry) => {
    expect(() => parseGlobalVariants(JSON.stringify([entry]))).toThrow(
      expect.objectContaining({
        name: "BadRequestError",
        message: "Invalid globalVariants value",
      }),
    );
  });

  it("rejects a non-array", () => {
    expect(() => parseGlobalVariants("{}")).toThrow(BadRequestError);
  });

  it("reports which entry and field is invalid", () => {
    expect(() =>
      parseGlobalVariants('[{"name":"Theme","value":"dark"},{"name":"Mode"}]'),
    ).toThrow(
      expect.objectContaining({
        issues: [
          "globalVariants.1.value: Expected boolean, number, string, or string array",
        ],
      }),
    );
  });
});

describe("parseComponentProps", () => {
  it("preserves nested JSON values", () => {
    const props = {
      title: "Hi",
      count: 0,
      enabled: false,
      items: [null, { value: "" }],
    };
    expect(parseComponentProps(JSON.stringify(props))).toEqual(props);
    expect(parseComponentProps("{}")).toEqual({});
  });

  it("rejects arrays", () => {
    expect(() => parseComponentProps("[]")).toThrow(
      expect.objectContaining({
        name: "BadRequestError",
        message: "Invalid componentProps value",
      }),
    );
  });
});
