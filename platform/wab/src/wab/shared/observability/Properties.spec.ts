import { mergeProperties } from "@/wab/shared/observability/Properties";

describe("mergeProperties", () => {
  it("merges properties with later args taking precedence", () => {
    expect(mergeProperties({ a: 1 }, { b: 2 }, { a: 3 })).toEqual({
      a: 3,
      b: 2,
    });
  });

  it("returns undefined when all args are undefined", () => {
    expect(mergeProperties(undefined, undefined, undefined)).toBeUndefined();
  });

  it("returns undefined when all args are empty objects", () => {
    expect(mergeProperties({}, {}, {})).toBeUndefined();
  });

  it("handles partial args", () => {
    expect(mergeProperties({ a: 1 })).toEqual({ a: 1 });
    expect(mergeProperties({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it("does not mutate any argument", () => {
    const p1 = { a: 1 };
    const p2 = { a: 2, b: 2 };
    const p3 = { c: 3 };
    mergeProperties(p1, p2, p3);
    expect(p1).toEqual({ a: 1 });
    expect(p2).toEqual({ a: 2, b: 2 });
    expect(p3).toEqual({ c: 3 });
  });
});
