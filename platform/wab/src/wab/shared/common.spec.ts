import * as common from "@/wab/shared/common";
import {
  arrayEqIgnoreOrder,
  coalesce,
  demapify,
  doMaybeAsync,
  firstWhere,
  fullRgb,
  groupConsecBy,
  interleave,
  intersectSets,
  isShortUuidV4,
  isUuidV4,
  isValidIsoDate,
  lastWhere,
  longestCommonPrefix,
  mapify,
  maybe,
  mergeSets,
  mkShortId,
  mkShortUuid,
  mkUuid,
  multimap,
  removeWhere,
  replace,
  replaceMultiple,
  replaceWhere,
  reSplitAll,
  rotateStartingFrom,
  shortZip,
  sliding,
  sortAs,
  swallow,
  swallowAsync,
  tryCatchElse,
  tuple,
  uniqueName,
  xExtend,
  xOmit,
  xpick,
} from "@/wab/shared/common";
import { mkVariant } from "@/wab/shared/Variants";
import dayjs from "dayjs";
import { identity } from "lodash";

const isEven = (x) => x % 2 === 0;

class Foo {
  foo: string;
}
class Bar {
  bar: string;
}

describe("isValidIsoDate", function () {
  it("should check if a string is a date in ISO formate", () => {
    expect(isValidIsoDate("2018-11-25")).toEqual(true);
    expect(isValidIsoDate("2018-04-30")).toEqual(true);

    expect(isValidIsoDate("2018-04-31")).toEqual(false); // invalid date
    expect(isValidIsoDate("2018-25-11")).toEqual(false); // invalid date
    expect(isValidIsoDate("dfhfdh")).toEqual(false);
    expect(isValidIsoDate("")).toEqual(false);
    expect(isValidIsoDate(undefined)).toEqual(false);

    expect(isValidIsoDate("2018/11/25")).toEqual(false); // invalid separator
    expect(isValidIsoDate("2018/25/11")).toEqual(false); // invalid date and separator

    expect(isValidIsoDate(new Date().toISOString())).toEqual(true);
    expect(isValidIsoDate(dayjs().toISOString())).toEqual(true);
    expect(isValidIsoDate("2023-08-16T08:00:00-04:00")).toEqual(true); // New York
    expect(isValidIsoDate("2023-08-16T12:00:00Z")).toEqual(true); // UTC
    expect(isValidIsoDate("2023-08-17T02:00:00+10:00")).toEqual(true); // Sydney

    expect(isValidIsoDate("2023-08-17T02:00:00+10:0")).toEqual(false); // Invalid Sydney (invalid timezone)
    expect(isValidIsoDate("2023-08-17T02:00:0010:00")).toEqual(false); // Invalid Sydney (invalid timezone)
    expect(isValidIsoDate("2023-08-17 02:00:00+10:00")).toEqual(false); // Invalid Sydney (spaces not allowed)
  });
  it("should only validate ISO strings in extended format (i.e. include time)", () => {
    expect(isValidIsoDate("2018-11-25")).toEqual(true); // extended only
    expect(isValidIsoDate("2018-11-25", true)).toEqual(false); // extended only

    expect(isValidIsoDate("2023-08-17T02:00:00+10:00", true)).toEqual(true); // Sydney

    expect(isValidIsoDate("2023-08-17T02:00:00+10:0", true)).toEqual(false); // Invalid Sydney (invalid timezone)
    expect(isValidIsoDate("2023-08-17T02:00:0010:00", true)).toEqual(false); // Invalid Sydney (invalid timezone)
    expect(isValidIsoDate("2023-08-17 02:00:00+10:00", true)).toEqual(false); // Invalid Sydney (spaces not allowed)
    expect(isValidIsoDate("2023-08-17T", true)).toEqual(false); // missing time
  });
});

describe("switchType", function () {
  it("should evaluate in `else`", function () {
    const res = common
      .switchType<Foo | Bar>(new Foo())
      .when(Foo, () => "Foo")
      .elseUnsafe(() => "else");
    expect(res).toBe("Foo");
  });
  it("should handle null in `else`", function () {
    const res = common
      .switchType<Foo | Bar | null>(null)
      .when(Foo, () => "Foo")
      .elseUnsafe(() => "else");
    expect(res).toBe("else");
  });
  it("should throw on null in `result`", () =>
    expect(() =>
      common
        .switchType(null as any as Foo)
        .when(Foo, () => "Foo")
        .result()
    ).toThrow());
  it("should not treat nulls, or scalars as Objects", () => {
    for (const query of [null, "", 0]) {
      const res = common
        .switchType(query)
        .when(Object, () => "Object")
        .elseUnsafe(() => "else");
      expect(res).toBe("else");
    }
  });
  return it("should treat Arrays, Dates, Functions as Objects", () => {
    for (const query of [[], new Date(), () => {}]) {
      const res = common
        .switchType(query)
        .when(Object, () => "Object")
        .result();
      expect(res).toBe("Object");
    }
  });
});

describe("firstWhere/lastWhere", function () {
  it("returns null given []", () => {
    expect(firstWhere([], (x) => true)).toEqual(tuple(null, -1));
    expect(lastWhere([], (x) => true)).toEqual(tuple(null, -1));
  });
  it("returns null when nothing matches", () => {
    const xs = [1, 2, 3, 4];
    expect(firstWhere(xs, (x) => x > 5)).toEqual(tuple(null, -1));
    expect(lastWhere(xs, (x) => x > 5)).toEqual(tuple(null, -1));
  });
  it("returns same value when only one match exists", () => {
    const arr = [1, 2, 3, 4];
    expect(firstWhere(arr, (x) => x === 2)).toEqual(tuple(2, 1));
    expect(lastWhere(arr, (x) => x === 2)).toEqual(tuple(2, 1));
  });
  it("returns same value but different index with duplicates", () => {
    const arr = [1, 2, 2, 3, 4];
    expect(firstWhere(arr, (x) => x === 2)).toEqual(tuple(2, 1));
    expect(lastWhere(arr, (x) => x === 2)).toEqual(tuple(2, 2));
  });
  it("returns first/last element when f -> true", () => {
    const xs = [1, 2, 3, 4];
    expect(firstWhere(xs, (x) => true)).toEqual(tuple(1, 0));
    expect(lastWhere(xs, (x) => true)).toEqual(tuple(4, 3));
  });
  it("returns first/last even number when f isEven", () => {
    const xs = [1, 2, 3, 4];
    expect(firstWhere(xs, isEven)).toEqual(tuple(2, 1));
    expect(lastWhere(xs, isEven)).toEqual(tuple(4, 3));
  });
});

describe("removeWhere", () => {
  let xs: number[];
  beforeEach(() => {
    xs = [1, 2, 3, 4];
  });
  it("removes from end", () => {
    removeWhere(xs, (x) => x === 4);
    expect(xs).toEqual([1, 2, 3]);
  });
  it("removes from beginning", () => {
    removeWhere(xs, (x) => x === 1);
    expect(xs).toEqual([2, 3, 4]);
  });
  it("removes all satisfying", () => {
    removeWhere(xs, isEven);
    expect(xs).toEqual([1, 3]);
  });
  it("removes nothing", () => {
    removeWhere(xs, () => false);
    expect(xs).toEqual([1, 2, 3, 4]);
  });
});

describe("fullRgb", () =>
  it("expands shorthands", function () {
    expect(fullRgb("#ab9")).toBe("#aabb99");
    return expect(fullRgb("#aabb99")).toBe("#aabb99");
  }));

describe("arrayEqIgnoreOrder", () =>
  it("should equal ignoring order", function () {
    expect(arrayEqIgnoreOrder([1, 2], [2, 1])).toBeTruthy();
    const vs1 = mkVariant({ name: "v1" });
    const vs2 = mkVariant({ name: "v2" });
    expect(arrayEqIgnoreOrder([vs1, vs2, vs1], [vs2, vs1, vs1])).toBeTruthy();
    expect(arrayEqIgnoreOrder([vs1, vs2, vs2], [vs2, vs1, vs1])).toBeFalsy();
  }));

describe("shortZip", () =>
  it("should work", function () {
    expect(shortZip([], [])).toEqual([]);
    expect(shortZip([0], [])).toEqual([]);
    expect(shortZip([0], [1])).toEqual([tuple(0, 1)]);
    expect(shortZip(tuple(0, 2), [1])).toEqual([tuple(0, 1)]);
    expect(shortZip(tuple(0, 2), tuple(1, 3))).toEqual(tuple([0, 1], [2, 3]));
    expect(shortZip([0, 2, 4], tuple(1, 3))).toEqual(tuple([0, 1], [2, 3]));
    return expect(shortZip([0, 2, 4], [1])).toEqual([tuple(0, 1)]);
  }));

describe("interleave", () =>
  it("should work", function () {
    expect(interleave([], [])).toEqual([]);
    expect(interleave([0], [])).toEqual([0]);
    expect(interleave([0], [1])).toEqual(tuple(0, 1));
    expect(interleave(tuple(0, 2), [1])).toEqual([0, 1, 2]);
    expect(interleave(tuple(0, 2), tuple(1, 3))).toEqual([0, 1, 2, 3]);
    return expect(interleave([0, 2, 4], tuple(1, 3))).toEqual([0, 1, 2, 3, 4]);
  }));

describe("mkShortId", () => {
  it("generates short id (nanoid)", () => {
    const id = mkShortId();
    expect(id).toHaveLength(12);
  });
});

describe("mkShortUuid/isShortUuidV4", () => {
  it("generates and validates valid values", () => {
    const id = mkShortUuid();
    expect(id).toHaveLength(22);
    expect(isShortUuidV4(id)).toBeTrue();
  });
  it("does not validate invalid values", () => {
    expect(isShortUuidV4("")).toBeFalse();
    expect(isShortUuidV4("not-short-uuid-v4")).toBeFalse();
    expect(isShortUuidV4(mkUuid())).toBeFalse();
    expect(isShortUuidV4(mkShortId())).toBeFalse();
  });
});

describe("mkUuid/isUuidV4", () => {
  it("generates and validates valid values", () => {
    const id = mkUuid();
    expect(id).toHaveLength(36);
    expect(isUuidV4(id)).toBeTruthy();
  });
  it("does not validate invalid values", () => {
    expect(isUuidV4("")).toBeFalse();
    expect(isUuidV4("not-uuid-v4")).toBeFalse();
    expect(isUuidV4(mkShortId())).toBeFalse();
    expect(isUuidV4(mkShortUuid())).toBeFalse();
  });
});

describe("replace", () =>
  it("should work", () => expect(replace([2, 4, 6], 4, 5)).toEqual([2, 5, 6])));

describe("replaceMultiple", () => {
  it("should work at start", () =>
    expect(replaceMultiple([2, 4, 6], 2, [1])).toEqual([1, 4, 6]));
  it("should work at middle", () =>
    expect(replaceMultiple([2, 4, 6], 4, [4, 5])).toEqual([2, 4, 5, 6]));
  it("should work at end", () =>
    expect(replaceMultiple([2, 4, 6], 6, [5, 6])).toEqual([2, 4, 5, 6]));
  it("should work with empty array", () =>
    expect(replaceMultiple([2, 4, 6], 4, [])).toEqual([2, 6]));
});

describe("replaceWhere", () =>
  it("should work", () =>
    expect(replaceWhere([2, 3, 4], (x) => x % 2 !== 0, 0)).toEqual([2, 0, 4])));

describe("multimap", () =>
  it("should work", function () {
    const x = "x";
    const y = "y";
    return expect(
      demapify(multimap([tuple(x, 0), tuple(y, 2), tuple(x, 1), tuple(y, 3)]))
    ).toEqual(
      demapify(
        new Map([
          [x, [0, 1]],
          [y, [2, 3]],
        ])
      )
    );
  }));

describe("xpick", function () {
  it("should work", () =>
    expect(
      demapify(
        xpick(
          new Map([
            [0, 1],
            [2, 3],
          ]),
          0
        )
      )
    ).toEqual(demapify(new Map([tuple(0, 1)]))));
  return it("should fail on missing keys", () =>
    expect(() => xpick(new Map([tuple(0, 1)]), 2)).toThrow());
});

describe("uniqueName", () =>
  it("should work", function () {
    expect(uniqueName(tuple("a", "b"), "my thing")).toBe("my thing");
    expect(uniqueName(["a", "b", "my thing"], "my thing")).toBe("my thing 2");
    expect(uniqueName(["a", "b", "my thing 1"], "my thing")).toBe("my thing");
    expect(uniqueName(["a", "b", "my thing", "my thing 2"], "my thing")).toBe(
      "my thing 3"
    );
    expect(uniqueName(["a", "b", "my thing", "my thing 2"], "my thing 2")).toBe(
      "my thing 3"
    );
    expect(uniqueName(["a", "b", "my thing", "my thing 3"], "my thing")).toBe(
      "my thing 2"
    );
    expect(uniqueName(["a", "a 2", "a 3", "a 4", "a 5"], "a")).toBe("a 6");
    return expect(uniqueName(["a", "b", "my thing 2"], "my thing")).toBe(
      "my thing"
    );
  }));

describe("longestCommonPrefix", () =>
  it("should work", function () {
    expect(longestCommonPrefix([0, 1, 2], [2, 1, 0])).toEqual([]);
    expect(longestCommonPrefix([0, 1, 2], [0, 1, 2])).toEqual([0, 1, 2]);
    expect(longestCommonPrefix([0, 1, 2], tuple(0, 1))).toEqual(tuple(0, 1));
    return expect(longestCommonPrefix([0, 1, 2], [0, 2, 1])).toEqual([0]);
  }));

describe("tryCatchElse", function () {
  it("should return the catch result if ending there", function () {
    const ret = tryCatchElse({
      try: () => {
        throw new Error("hello");
      },
      catch: (e) => e,
      else: () => "unexpected",
    });
    expect(ret).toEqual(new Error("hello"));
  });
  it("should return the else result if ending there", function () {
    const ret = tryCatchElse({
      try: () => "hello",
      catch: (e) => e,
      else: () => "expected",
    });
    expect(ret).toBe("expected");
  });
  it("should return the try result if nothing thrown and no else", function () {
    const ret = tryCatchElse({
      try: () => "hello",
      catch: (e) => e,
    });
    expect(ret).toBe("hello");
  });
  it("should throw anything thrown from catch clause", () =>
    expect(() =>
      tryCatchElse({
        try: () => {
          let res;
          throw (res = new Error("hello"));
        },
        catch: (e) => {
          throw new Error("second");
        },
        else: () => {
          let res;
          return (res = "unexpected");
        },
      })
    ).toThrow());
  return it("should throw anything thrown from else clause", () =>
    expect(() =>
      tryCatchElse({
        try: () => "hello",
        catch: (e) => {
          throw new Error("second");
        },
        else: () => {
          throw new Error("third");
        },
      })
    ).toThrow());
});

describe("xOmit", () =>
  it("should work", function () {
    const expected = demapify(
      xOmit(mapify({ a: 0, b: 1, c: 2, d: 3 }), "a", "b", "e")
    );
    return expect(expected).toEqual({ c: 2, d: 3 });
  }));

describe("xExtend", () =>
  it("should work", function () {
    const expected = demapify(
      xExtend(mapify({ a: 0 }), mapify({ b: 0 }), mapify({ b: 1, c: 2 }))
    );
    return expect(expected).toEqual({ a: 0, b: 1, c: 2 });
  }));

describe("reSplitAll", () =>
  it("should return all matches", function () {
    const res = reSplitAll(/a/g, "abab");
    return expect(
      res.map(([a, b]) => {
        let left;

        return tuple(
          a,
          coalesce(
            maybe(b, (x) => x.slice()),
            () => null
          )
        );
      })
    ).toEqual([tuple("", ["a"]), tuple("b", ["a"]), tuple("b", null)]);
  }));

describe("groupConsecBy", () =>
  it("should work", () =>
    expect(groupConsecBy([0, 0, 1, 4, 1, 2, 0], (x) => x % 3)).toEqual([
      tuple(0, [0, 0]),
      tuple(1, [1, 4, 1]),
      tuple(2, [2]),
      tuple(0, [0]),
    ])));

describe("rotateStartingFrom", () => {
  it("works", () => {
    expect(rotateStartingFrom([1, 2, 3], 1)).toEqual([1, 2, 3]);
    expect(rotateStartingFrom([1, 2, 3], 2)).toEqual([2, 3, 1]);
    expect(rotateStartingFrom([1, 2, 3], 3)).toEqual([3, 1, 2]);
  });
});

describe("sliding", () => {
  it("works", () => {
    expect(sliding([1, 2, 3], 2, 2)).toEqual([[1, 2], [3]]);
    expect(sliding([1, 2, 3], 2, 1)).toEqual([[1, 2], [2, 3], [3]]);
    expect(sliding([1, 2, 3], 2, 1, true)).toEqual([
      [1, 2],
      [2, 3],
    ]);
  });
});

describe("doMaybe", () => {
  it("works", async () => {
    const run = async (shouldBeDefined: boolean) => {
      const forty = async () => 42;
      const mightbe = async () => (shouldBeDefined ? "" : null);
      const z = async () => "yay";
      return await doMaybeAsync(async (yld) => {
        const a = await yld(forty());
        const b = await yld(mightbe());
        const c = await yld(z());
        return c;
      });
    };
    expect(await run(false)).toBe(undefined);
    expect(await run(true)).toBe("yay");
  });
});

describe("mergeAllowEmpty", () => {
  it("works", () => {
    expect(
      common.mergeSane(
        { x: 1, y: 2, z: { z1: 1, z2: 2 } },
        { x: 3, z: { z2: 10 } }
      )
    ).toEqual({ x: 3, y: 2, z: { z1: 1, z2: 10 } });
    expect(
      common.mergeSane({ x: 1, y: 2, z: { z1: 1, z2: 2 } }, { x: 3, z: {} })
    ).toEqual({ x: 3, y: 2, z: {} });
    expect(
      common.mergeSane({ x: 1, y: 2, z: ["a", "b", "c"] }, { x: 3, z: [] })
    ).toEqual({ x: 3, y: 2, z: [] });
    expect(
      common.mergeSane(
        { x: 1, y: 2, z: [{ a: 3 }, { b: 4 }, { c: 5 }] },
        { x: 3, z: [] }
      )
    ).toEqual({ x: 3, y: 2, z: [] });
    expect(
      common.mergeSane(
        { x: 1, y: 2, z: [{ a: 3 }, { b: 4 }, { c: 5 }] },
        { x: 3, z: [{ a2: 30 }, { b: 40 }] }
      )
    ).toEqual({ x: 3, y: 2, z: [{ a2: 30 }, { b: 40 }] });
    expect(
      common.mergeSane(
        { x: { x1: 1 }, y: 2, z: [{ a: 3 }] },
        { x: {}, z: [{ a2: 30 }, { b: 40 }] },
        { z: [] }
      )
    ).toEqual({ x: {}, y: 2, z: [] });

    // L.merge merges two array element wise...
    expect(
      common.mergeSane(
        {
          x: { x1: 1 },
          time: 4,
          z: [
            { id: "1", scheme: "blackbox" },
            { id: "3", scheme: "direct" },
          ],
        },
        { time: 5 },
        { z: [{ id: "2", scheme: "direct" }] }
      )
    ).toEqual({
      x: { x1: 1 },
      time: 5,
      z: [{ id: "2", scheme: "direct" }],
    });
  });

  describe("assignAllowEmpty", () => {
    it("works", () => {
      expect(
        common.assignAllowEmpty(
          { x: 1, y: 2, z: { z1: 1, z2: 2 } },
          { x: 3, z: { z2: 10 } }
        )
      ).toEqual({ x: 3, y: 2, z: { z2: 10 } });

      expect(
        common.assignAllowEmpty(
          { x: 1, y: 2, z: { z1: 1, z2: 2 } },
          { x: 3, z: {} }
        )
      ).toEqual({ x: 3, y: 2, z: {} });
      expect(
        common.assignAllowEmpty(
          { x: 1, y: 2, z: ["a", "b", "c"] },
          { x: 3, z: [] }
        )
      ).toEqual({ x: 3, y: 2, z: [] });
      expect(
        common.assignAllowEmpty(
          { x: 1, y: 2, z: [{ a: 3 }, { b: 4 }, { c: 5 }] },
          { x: 3, z: [] }
        )
      ).toEqual({ x: 3, y: 2, z: [] });
      expect(
        common.assignAllowEmpty(
          { x: 1, y: 2, z: [{ a: 3 }, { b: 4 }, { c: 5 }] },
          { x: 3, z: [{ a2: 30 }, { b: 40 }] }
        )
      ).toEqual({ x: 3, y: 2, z: [{ a2: 30 }, { b: 40 }] });
      expect(
        common.assignAllowEmpty(
          { x: { x1: 1 }, y: 2, z: [{ a: 3 }] },
          { x: {}, z: [{ a2: 30 }, { b: 40 }] },
          { z: [] }
        )
      ).toEqual({ x: {}, y: 2, z: [] });

      expect(
        common.assignAllowEmpty(
          {
            x: { x1: 1 },
            time: 4,
            z: [
              { id: "1", scheme: "blackbox" },
              { id: "3", scheme: "direct" },
            ],
          },
          { time: 5 },
          { z: [{ id: "2", scheme: "direct" }] }
        )
      ).toEqual({
        x: { x1: 1 },
        time: 5,
        z: [{ id: "2", scheme: "direct" }],
      });
    });
  });
});

describe("swallow", () => {
  it("works", async () => {
    expect(
      swallow(() => {
        throw new Error("bad bad bad");
      })
    ).toBeNull();
    expect(
      swallow(() => {
        return "foobar";
      })
    ).toEqual("foobar");
  });
});

describe("swallowAsync", () => {
  it("works", async () => {
    const fn1 = async () => {
      return "foobar";
    };
    await expect(swallowAsync(fn1())).resolves.toEqual("foobar");
    const fn2 = async () => {
      throw new Error("bad bad bad");
    };
    await expect(swallowAsync(fn2())).resolves.toBeUndefined();
    await expect(swallowAsync(Promise.resolve("foobar"))).resolves.toEqual(
      "foobar"
    );
    await expect(
      swallowAsync(Promise.reject("bad bad bad"))
    ).resolves.toBeUndefined();
    await expect(
      swallowAsync(
        new Promise((resolve, reject) => {
          resolve("foobar");
        })
      )
    ).resolves.toEqual("foobar");
    await expect(
      swallowAsync(
        new Promise((resolve, reject) => {
          reject("bad bad bad");
        })
      )
    ).resolves.toBeUndefined();
    await expect(
      swallowAsync(
        new Promise((resolve, reject) => {
          throw new Error("bad bad bad");
        })
      )
    ).resolves.toBeUndefined();
  });
});

describe("mergeSets", () => {
  it("works for primitives", () => {
    const toMerge = [
      new Set([1, 2, true]),
      new Set([1, "a", "b"]),
      new Set([2, true, "a"]),
    ];
    const merged = mergeSets(...toMerge);
    expect(merged).toContain(1);
    expect(merged).toContain(2);
    expect(merged).toContain(true);
    expect(merged).toContain("a");
    expect(merged).toContain("b");
    expect(merged.size).toEqual(5);
  });

  it("works for objects", () => {
    const objA1 = { name: "A" };
    const objA2 = { name: "A" };
    const objB = { name: "B" };
    const arr1 = [];
    const arr2 = [];
    const toMerge = [
      new Set([arr1, objA1]),
      new Set([arr1, arr2, objA2]),
      new Set([objA1, objB]),
    ];
    const merged = mergeSets(...toMerge);
    expect(merged).toContain(objA1);
    expect(merged).toContain(objA2);
    expect(merged).toContain(objB);
    expect(merged).toContain(arr1);
    expect(merged).toContain(arr2);
    expect(merged.size).toEqual(5);
  });
});

describe("intersectSets", () => {
  it("works for primitives", () => {
    const set1 = new Set([1, 2, true, "a"]);
    const set2 = new Set([1, "a", "b"]);
    const intersection = intersectSets(set1, set2);
    expect(intersection).toContain(1);
    expect(intersection).toContain("a");
    expect(intersection.size).toEqual(2);
  });
});

describe("sortAs", () => {
  it("works for primitives", () => {
    expect(sortAs([1, 3, 5, 7], [5, 7, 3, 1], identity)).toEqual([5, 7, 3, 1]);
  });
  it("works for objects", () => {
    expect(
      sortAs(
        [{ name: "red" }, { name: "blue" }, { name: "green" }],
        ["blue", "red", "yellow", "green"],
        (x) => x.name
      )
    ).toEqual([{ name: "blue" }, { name: "red" }, { name: "green" }]);
  });
  it("works for missing keys", () => {
    expect(
      sortAs(
        [{ name: "red" }, { name: "blue" }, { name: "green" }],
        ["blue", "red", "yellow"],
        (x) => x.name
      )
    ).toEqual([{ name: "blue" }, { name: "red" }, { name: "green" }]);
  });
});

describe("sortedInsert", () => {
  it("works for numbers", () => {
    const nums = [2, 4, 6, 8];
    common.sortedInsert(nums, 3);
    expect(nums).toEqual([2, 3, 4, 6, 8]);
    common.sortedInsert(nums, -1);
    expect(nums).toEqual([-1, 2, 3, 4, 6, 8]);
    common.sortedInsert(nums, 10);
    expect(nums).toEqual([-1, 2, 3, 4, 6, 8, 10]);
  });
  it("works for strings", () => {
    const nums = ["a", "a.b[0]", "a.b[0].c", "a.b[2]"];
    common.sortedInsert(nums, "a.b[1]");
    expect(nums).toEqual(["a", "a.b[0]", "a.b[0].c", "a.b[1]", "a.b[2]"]);
    common.sortedInsert(nums, "a.b[0].d");
    expect(nums).toEqual([
      "a",
      "a.b[0]",
      "a.b[0].c",
      "a.b[0].d",
      "a.b[1]",
      "a.b[2]",
    ]);
    common.sortedInsert(nums, "a.b[3].d");
    expect(nums).toEqual([
      "a",
      "a.b[0]",
      "a.b[0].c",
      "a.b[0].d",
      "a.b[1]",
      "a.b[2]",
      "a.b[3].d",
    ]);
  });
});

describe("structuralMerge", () => {
  it("works", () => {
    expect(common.structuralMerge2([1, 2, 3], ["a", "b"])).toEqual([
      1,
      2,
      3,
      "a",
      "b",
    ]);
    expect(
      common.structuralMerge2(
        { x: { y: [1, 2, 3], z: "ok" }, a: "yes" },
        { x: { y: ["a", "b"], w: "nope" }, a: "no" }
      )
    ).toEqual({ x: { y: [1, 2, 3, "a", "b"], z: "ok", w: "nope" }, a: "yes" });
  });
});

describe("sortByKeys", () => {
  it("works", () => {
    expect(
      common.sortByKeys(
        [
          { name: "bob", age: 12 },
          { name: "alice", age: 18 },
          { name: "frank", age: 10 },
          { name: "bob", age: 12 },
          { name: "alice", age: 26 },
        ],
        (person) => [person.name, person.age]
      )
    ).toEqual([
      { name: "alice", age: 18 },
      { name: "alice", age: 26 },
      { name: "bob", age: 12 },
      { name: "bob", age: 12 },
      { name: "frank", age: 10 },
    ]);
  });
});
