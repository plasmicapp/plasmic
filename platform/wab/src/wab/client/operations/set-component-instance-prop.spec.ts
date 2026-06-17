import { setComponentInstanceProp } from "@/wab/client/operations/set-component-instance-prop";
import { setupComponentWithInstance } from "@/wab/client/operations/tests/utils";
import { assert } from "@/wab/shared/common";
import { tryExtractJson } from "@/wab/shared/core/exprs";
import { ensureKnownVariantsRef } from "@/wab/shared/model/classes";

describe("setComponentInstanceProp", () => {
  it("sets props of different types", () => {
    const { instance, getArg, opts } = setupComponentWithInstance();

    for (const [propName, value] of [
      ["label", "Buy now"],
      ["count", 3],
      ["disabled", true],
      ["data", { columns: 2, header: { sticky: true } }],
      ["data", [1, "two", false, { id: 3 }, ["nested"]]],
    ] as const) {
      const result = setComponentInstanceProp(instance, propName, value, opts);
      expect(result.result).toEqual("success");
      expect(tryExtractJson(getArg(instance, propName)!.expr)).toEqual(value);
    }
  });

  it("sets literal null on an any-typed prop", () => {
    const { instance, getArg, opts } = setupComponentWithInstance();

    const result = setComponentInstanceProp(instance, "data", null, opts);

    expect(result.result).toEqual("success");
    const arg = getArg(instance, "data");
    expect(arg).toBeDefined();
    expect(tryExtractJson(arg!.expr)).toBeNull();
  });

  it("updates an existing prop value", () => {
    const { instance, getArg, opts } = setupComponentWithInstance();

    setComponentInstanceProp(instance, "label", "One", opts);
    setComponentInstanceProp(instance, "label", "Two", opts);

    expect(tryExtractJson(getArg(instance, "label")!.expr)).toEqual("Two");
  });

  it("selects a single-choice variant by name", () => {
    const { instance, sizeGroup, getArg, opts } = setupComponentWithInstance();

    const result = setComponentInstanceProp(instance, "size", "large", opts);

    expect(result.result).toEqual("success");
    const variantsRef = ensureKnownVariantsRef(getArg(instance, "size")!.expr);
    expect(variantsRef.variants).toEqual([
      sizeGroup.variants.find((v) => v.name === "large"),
    ]);
  });

  it("selects multi-choice variants from an array of names", () => {
    const { instance, featuresGroup, getArg, opts } =
      setupComponentWithInstance();

    const result = setComponentInstanceProp(
      instance,
      "features",
      ["rounded", "shadow"],
      opts
    );

    expect(result.result).toEqual("success");
    const variantsRef = ensureKnownVariantsRef(
      getArg(instance, "features")!.expr
    );
    expect(variantsRef.variants).toEqual(featuresGroup.variants);
  });

  it("activates a standalone variant with true", () => {
    const { instance, darkGroup, getArg, opts } = setupComponentWithInstance();

    const result = setComponentInstanceProp(instance, "dark", true, opts);

    expect(result.result).toEqual("success");
    const variantsRef = ensureKnownVariantsRef(getArg(instance, "dark")!.expr);
    expect(variantsRef.variants).toEqual([darkGroup.variants[0]]);
  });

  it("sets a choice prop to one of its options", () => {
    const { instance, getArg, opts } = setupComponentWithInstance();

    const result = setComponentInstanceProp(
      instance,
      "tone",
      "secondary",
      opts
    );

    expect(result.result).toEqual("success");
    expect(tryExtractJson(getArg(instance, "tone")!.expr)).toEqual("secondary");
  });

  it("sets a dateString prop to an ISO date string", () => {
    const { instance, getArg, opts } = setupComponentWithInstance();

    const result = setComponentInstanceProp(
      instance,
      "publishedAt",
      "2024-01-01T00:00:00.000Z",
      opts
    );

    expect(result.result).toEqual("success");
    expect(tryExtractJson(getArg(instance, "publishedAt")!.expr)).toEqual(
      "2024-01-01T00:00:00.000Z"
    );
  });

  it("sets a dateRangeStrings prop to a [from, to] pair", () => {
    const { instance, getArg, opts } = setupComponentWithInstance();

    for (const range of [
      ["2024-01-01", "2024-12-31"],
      ["2024-01-01T08:30:00.000Z", "2024-12-31T17:00:00.000Z"],
    ] as const) {
      const result = setComponentInstanceProp(
        instance,
        "activeRange",
        range,
        opts
      );
      expect(result.result).toEqual("success");
      expect(tryExtractJson(getArg(instance, "activeRange")!.expr)).toEqual(
        range
      );
    }
  });

  it("errors on an unknown prop", () => {
    const { instance, opts } = setupComponentWithInstance();

    const result = setComponentInstanceProp(instance, "nope", "value", opts);

    assert(result.result === "error", "expected error");
    expect(result.message).toContain(`has no prop "nope"`);
  });

  it("errors on a slot prop", () => {
    const { instance, opts } = setupComponentWithInstance();

    const result = setComponentInstanceProp(
      instance,
      "children",
      "content",
      opts
    );

    assert(result.result === "error", "expected error");
    expect(result.message).toContain("slot");
  });

  it("errors on invalid values without mutating", () => {
    const { instance, getArg, opts } = setupComponentWithInstance();

    for (const [propName, value, expected] of [
      ["disabled", "yes", "expects a boolean"],
      ["disabled", ["yes"], "expects a boolean"],
      ["disabled", null, "expects a boolean"],
      ["count", { value: 3 }, "expects a number"],
      ["label", 42, "expects a string"],
      ["label", ["x"], "expects a string"],
      ["label", null, "expects a string"],
      ["tone", "tertiary", "must be one of"],
      ["publishedAt", 1700000000000, "expects a date string"],
      [
        "activeRange",
        "2024-01-01",
        "expects an array of [from, to] date strings",
      ],
      [
        "activeRange",
        ["2024-01-01"],
        "expects an array of [from, to] date strings",
      ],
      ["activeRange", [], "expects an array of [from, to] date strings"],
      [
        "activeRange",
        ["2024-01-01", "2024-06-01", "2024-12-31"],
        "expects an array of [from, to] date strings",
      ],
      ["activeRange", [1, 2], "expects an array of [from, to] date strings"],
      ["size", "invalid", `no variant matching "invalid"`],
    ] as const) {
      const result = setComponentInstanceProp(instance, propName, value, opts);
      assert(result.result === "error", "expected error");
      expect(result.message).toContain(expected);
      expect(getArg(instance, propName)).toBeUndefined();
    }
  });

  it("errors on a param type that is not supported yet", () => {
    const { instance, getArg, opts } = setupComponentWithInstance();

    const result = setComponentInstanceProp(instance, "query", {}, opts);

    assert(result.result === "error", "expected error");
    expect(result.message).toContain("is not supported yet");
    expect(getArg(instance, "query")).toBeUndefined();
  });
});
