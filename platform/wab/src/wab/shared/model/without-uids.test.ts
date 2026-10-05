import { withoutUids } from "@/wab/shared/model/model-meta";

function defineThrowingGetter(obj: any, key: string, enumerable: boolean) {
  Object.defineProperty(obj, key, {
    enumerable,
    get() {
      throw new Error(`cannot read ${key}`);
    },
  });
}

describe("withoutUids", () => {
  // withoutUids copies inherited enumerable keys too.
  class WithInheritedKey {
    uid = 1;
    own = 1;
  }
  Object.defineProperty(WithInheritedKey.prototype, "inherited", {
    enumerable: true,
    value: 2,
  });

  const repeated = { uid: 2, v: "repeated" };
  const once = { uid: 3, v: "once" };
  const withSymbolAndHiddenKeys: any = { [Symbol.for("s")]: 1, a: 1 };
  defineThrowingGetter(withSymbolAndHiddenKeys, "hidden", false);

  // toStrictEqual ignores key order, and callers compare JSON.stringify
  // output, so each row checks both.
  it.each<[string, any, any]>([
    ["drops uid and uuid", { uid: 1, uuid: "u", b: 2, a: 1 }, { a: 1, b: 2 }],
    [
      "visits keys in string order, so the repeat marker numbers follow it",
      { uid: 1, "2": repeated, "10": once, a: repeated },
      { "10": { v: "once" }, "2": { v: "repeated" }, a: "[seen@2]" },
    ],
    [
      "keeps inherited enumerable keys",
      new WithInheritedKey(),
      { inherited: 2, own: 1 },
    ],
    ["keeps an own constructor key", { constructor: 1 }, { constructor: 1 }],
    [
      "makes arrays dense, with holes as undefined",
      // eslint-disable-next-line no-sparse-arrays
      [1, , { uid: 2, v: 3 }],
      [1, undefined, { v: 3 }],
    ],
    [
      "converts a typed array by its indexes",
      new Uint8Array([7, 8]),
      { "0": 7, "1": 8 },
    ],
    [
      "converts dates and maps to empty objects",
      [new Date(5), new Map([[1, 2]])],
      [{}, {}],
    ],
    [
      "turns a null-prototype object into a plain object",
      Object.assign(Object.create(null), { b: 1, a: 2 }),
      { a: 2, b: 1 },
    ],
    [
      "drops symbol keys and skips non-enumerable keys",
      withSymbolAndHiddenKeys,
      { a: 1 },
    ],
  ])("%s", (_name, input, expected) => {
    const output = withoutUids(input);
    expect(output).toStrictEqual(expected);
    expect(JSON.stringify(output)).toBe(JSON.stringify(expected));
  });

  it("keeps uid and uuid, but not inherited keys, with includeUids", () => {
    const input = Object.assign(new WithInheritedKey(), { uuid: "u" });
    const output = withoutUids(input, { includeUids: true });
    expect(output).toStrictEqual({ own: 1, uid: 1, uuid: "u" });
    expect(Object.keys(output)).toEqual(["own", "uid", "uuid"]);
  });

  it("keeps an own __proto__ key as an own key", () => {
    const output = withoutUids(JSON.parse('{"__proto__": 1, "a": 2}'));
    expect(Object.keys(output)).toEqual(["__proto__", "a"]);
    expect(Object.getPrototypeOf(output)).toBe(Object.prototype);
  });

  it("keeps functions, NaN and -0 as they are", () => {
    const fn = () => 1;
    const output = withoutUids({ f: fn, n: NaN, z: -0 });
    expect(output.f).toBe(fn);
    expect(output.n).toBeNaN();
    expect(Object.is(output.z, -0)).toBe(true);
  });

  it.each(["boom", "uuid"])(
    "throws the getter's error when reading %s throws",
    (key) => {
      const input: any = { uid: 1, v: 1 };
      defineThrowingGetter(input, key, true);
      expect(() => withoutUids(input)).toThrow(`cannot read ${key}`);
    },
  );
});
