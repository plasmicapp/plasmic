import {
  diffArrays as diffArraysWithObject,
  diffObject as diffObjectWithObject,
} from "@/wab/shared/model/tracking";

/**
 * Checks that every change's object is `next`, and leaves it out of the
 * returned changes, so that the expected changes needn't repeat it
 */
function withoutObject<C extends { object: unknown }>(
  changes: C[],
  next: unknown,
): Omit<C, "object">[] {
  return changes.map(({ object, ...change }) => {
    expect(object).toBe(next);
    return change;
  });
}

function diffArrays(prev: string[], next: string[]) {
  return withoutObject(diffArraysWithObject(prev, next), next);
}

function diffObject(prev: object, next: object) {
  return withoutObject(diffObjectWithObject(prev, next), next);
}

/** Applies the splices `diffArrays` returns, to check that they make `next` */
function applySplices(prev: string[], next: string[]) {
  const cur = [...prev];
  for (const change of diffArrays(prev, next)) {
    expect(
      cur.slice(change.index, change.index + change.removed.length),
    ).toEqual(change.removed);
    cur.splice(change.index, change.removed.length, ...change.added);
  }
  return cur;
}

describe("diffArrays", () => {
  it("finds no changes between equal arrays", () => {
    expect(diffArrays(["a", "b"], ["a", "b"])).toEqual([]);
    expect(diffArrays([], [])).toEqual([]);
  });

  it("reports an append, prepend or single removal as one splice", () => {
    expect(diffArrays(["a", "b"], ["a", "b", "c", "d"])).toEqual([
      { type: "array-splice", index: 2, added: ["c", "d"], removed: [] },
    ]);
    expect(diffArrays(["b"], ["a", "b"])).toEqual([
      { type: "array-splice", index: 0, added: ["a"], removed: [] },
    ]);
    expect(diffArrays(["a", "b", "c"], ["a", "c"])).toEqual([
      { type: "array-splice", index: 1, added: [], removed: ["b"] },
    ]);
  });

  it("reports each run of removed items as its own splice", () => {
    expect(diffArrays(["a", "b", "c", "d", "e", "f"], ["a", "c", "f"])).toEqual(
      [
        { type: "array-splice", index: 1, added: [], removed: ["b"] },
        { type: "array-splice", index: 2, added: [], removed: ["d", "e"] },
      ],
    );
  });

  it("reports each run of inserted items as its own splice", () => {
    expect(diffArrays(["a", "c", "f"], ["a", "b", "c", "d", "e", "f"])).toEqual(
      [
        { type: "array-splice", index: 1, added: ["b"], removed: [] },
        { type: "array-splice", index: 3, added: ["d", "e"], removed: [] },
      ],
    );
  });

  it("reports a move or a mixed change as one splice of the range", () => {
    expect(diffArrays(["a", "b", "c"], ["c", "a", "b"])).toEqual([
      {
        type: "array-splice",
        index: 0,
        added: ["c", "a", "b"],
        removed: ["a", "b", "c"],
      },
    ]);
    expect(diffArrays(["a", "b", "c", "d"], ["a", "x", "d"])).toEqual([
      { type: "array-splice", index: 1, added: ["x"], removed: ["b", "c"] },
    ]);
  });

  it("doesn't let the common prefix and suffix overlap", () => {
    expect(diffArrays(["a", "a"], ["a", "a", "a"])).toEqual([
      { type: "array-splice", index: 2, added: ["a"], removed: [] },
    ]);
    expect(diffArrays(["a", "a", "a"], ["a"])).toEqual([
      { type: "array-splice", index: 1, added: [], removed: ["a", "a"] },
    ]);
  });

  it("makes the new array when applied in order", () => {
    const cases: [string[], string[]][] = [
      [
        ["a", "b", "c", "d", "e"],
        ["b", "d"],
      ],
      [
        ["b", "d"],
        ["a", "b", "c", "d", "e"],
      ],
      [
        ["a", "b", "a", "b"],
        ["a", "b"],
      ],
      [
        ["x", "a", "y", "a"],
        ["a", "a"],
      ],
      [
        ["a", "b", "c"],
        ["c", "b", "a"],
      ],
      [
        ["a", "b", "c", "d"],
        ["x", "b", "y", "d"],
      ],
      [[], ["a", "b"]],
      [["a", "b"], []],
    ];
    for (const [prev, next] of cases) {
      expect(applySplices(prev, next)).toEqual(next);
    }
  });
});

describe("diffObject", () => {
  it("diffs by key", () => {
    expect(
      diffObject({ a: "1", b: "2", c: "3" }, { c: "3", a: "x", d: "4" }),
    ).toEqual([
      { type: "obj-update", key: "a", oldValue: "1", newValue: "x" },
      { type: "obj-delete", key: "b", oldValue: "2" },
      { type: "obj-add", key: "d", newValue: "4" },
    ]);
    expect(diffObject({ a: "1" }, { a: "1" })).toEqual([]);
  });
});
