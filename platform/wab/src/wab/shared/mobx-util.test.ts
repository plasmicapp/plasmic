import {
  _testonly,
  coarseComputed,
  disposeOwnedComputedFns,
  keyedComputedFn,
  maybeComputedFn,
  ownedComputedFn,
} from "@/wab/shared/mobx-util";
import {
  autorun,
  comparer,
  configure,
  observable,
  onBecomeUnobserved,
} from "mobx";

describe("coarseComputed", () => {
  beforeAll(() => {
    configure({ enforceActions: "never" });
  });

  it("keeps its old result when the new one is equal", () => {
    const box = observable.box(1);
    const positive = coarseComputed(() => [box.get() > 0]);
    const results: boolean[][] = [];
    const dispose = autorun(() => results.push(positive.get()));

    box.set(2);
    expect(results).toHaveLength(1);
    box.set(-1);
    expect(results).toEqual([[true], [false]]);
    dispose();
  });

  it("lets a caller's equals override the default", () => {
    const box = observable.box(1);
    const positive = coarseComputed(() => [box.get() > 0], {
      equals: comparer.identity,
    });
    const results: boolean[][] = [];
    const dispose = autorun(() => results.push(positive.get()));

    box.set(2);
    expect(results).toEqual([[true], [true]]);
    expect(results[0]).not.toBe(results[1]);
    dispose();
  });
});

describe("maybeComputedFn", () => {
  beforeAll(() => {
    configure({ enforceActions: "never" });
  });

  it("caches when an arg is observable", () => {
    let runCounter = 0;
    const box = observable.box(0);
    const cachedFn = maybeComputedFn((b: typeof box) => {
      runCounter = runCounter + 1;
      return b.get();
    });
    expect(cachedFn(box)).toBe(0);
    expect(cachedFn(box)).toBe(0);
    expect(runCounter).toBe(1);
    box.set(1);
    expect(cachedFn(box)).toBe(1);
    expect(cachedFn(box)).toBe(1);
    expect(runCounter).toBe(2);
  });

  it("does not cache when no arg is observable", () => {
    let runCounter = 0;
    const cachedFn = maybeComputedFn((_: object) => {
      runCounter = runCounter + 1;
    });
    const arg = {};
    cachedFn(arg);
    cachedFn(arg);
    expect(runCounter).toBe(2);
  });
});

describe("keyedComputedFn", () => {
  it("caches by key when an arg is observable", () => {
    let runCounter = 0;
    const box = observable.box(0);
    const cachedFn = keyedComputedFn(
      (b: typeof box, _key: string) => {
        runCounter = runCounter + 1;
        return b.get();
      },
      { keyFn: (_b, key) => key },
    );
    cachedFn(box, "a");
    cachedFn(box, "a");
    expect(runCounter).toBe(1);
    cachedFn(box, "b");
    expect(runCounter).toBe(2);
    box.set(1);
    expect(cachedFn(box, "a")).toBe(1);
    expect(runCounter).toBe(3);
  });

  it("keeps an equal result only when coarse", () => {
    const box = observable.box(1);
    const mkFn = (coarse: boolean) =>
      keyedComputedFn((b: typeof box) => [b.get() > 0], {
        keyFn: () => "key",
        coarse,
      });
    const coarseFn = mkFn(true);
    const plainFn = mkFn(false);
    const coarseResult = coarseFn(box);
    const plainResult = plainFn(box);

    box.set(2);
    expect(coarseFn(box)).toBe(coarseResult);
    expect(plainFn(box)).not.toBe(plainResult);
    expect(plainFn(box)).toEqual(plainResult);
    box.set(-1);
    expect(coarseFn(box)).toEqual([false]);
  });
});

describe("ownedComputedFn", () => {
  beforeAll(() => {
    configure({ enforceActions: "never" });
  });

  it("caches per owner and args until an observable it read changes", () => {
    const box = observable.box(1);
    let runCounter = 0;
    const fn = ownedComputedFn((owner: { n: number }, m: number) => {
      runCounter++;
      return { value: owner.n * m * box.get() };
    });
    const owner1 = { n: 2 };
    const owner2 = { n: 3 };
    const result = fn(owner1, 5);
    expect(result.value).toBe(10);
    expect(fn(owner1, 5)).toBe(result);
    expect(runCounter).toBe(1);
    expect(fn(owner1, 7).value).toBe(14);
    expect(fn(owner2, 5).value).toBe(15);
    expect(runCounter).toBe(3);
    box.set(2);
    expect(fn(owner1, 5).value).toBe(20);
    expect(runCounter).toBe(4);
  });

  it("caches functions of only the owner", () => {
    let runCounter = 0;
    const fn = ownedComputedFn((_owner: object) => {
      runCounter++;
      return {};
    });
    const owner = {};
    expect(fn(owner)).toBe(fn(owner));
    expect(runCounter).toBe(1);
  });

  it("stops observing when its owner is disposed", () => {
    const box = observable.box(1);
    let unobserved = 0;
    onBecomeUnobserved(box, () => unobserved++);
    const fn1 = ownedComputedFn((_owner: object) => box.get());
    const fn2 = ownedComputedFn((_owner: object, n: number) => box.get() + n);
    const owner = {};
    const otherOwner = {};
    fn1(owner);
    fn2(owner, 1);
    fn2(otherOwner, 1);
    disposeOwnedComputedFns(owner);
    expect(unobserved).toBe(0);
    disposeOwnedComputedFns(otherOwner);
    expect(unobserved).toBe(1);

    let runCounter = 0;
    const fn3 = ownedComputedFn((_owner: object) => {
      runCounter++;
      return {};
    });
    const result = fn3(owner);
    expect(fn3(owner)).toBe(result);
    disposeOwnedComputedFns(owner);
    expect(fn3(owner)).not.toBe(result);
    expect(runCounter).toBe(2);
  });
});

describe("compareCustom", () => {
  const { compareCustom } = _testonly;

  it("compares collections by contents and anything else by identity", () => {
    const x = { name: "x" };
    const y = { name: "x" };
    class Inst {}
    const inst = new Inst();

    expect(compareCustom(1, 1)).toBe(true);
    expect(compareCustom("a", "b")).toBe(false);
    expect(compareCustom(null, undefined)).toBe(false);
    expect(compareCustom(inst, inst)).toBe(true);
    expect(compareCustom(new Inst(), new Inst())).toBe(false);

    expect(compareCustom([inst, 1], [inst, 1])).toBe(true);
    expect(compareCustom([inst, 1], [1, inst])).toBe(false);
    expect(compareCustom([inst], [inst, inst])).toBe(false);

    expect(compareCustom(new Set([inst, 1]), new Set([1, inst]))).toBe(true);
    expect(compareCustom(new Set([inst]), new Set([new Inst()]))).toBe(false);

    expect(
      compareCustom(
        new Map([[inst, new Set([x])]]),
        new Map([[inst, new Set([x])]]),
      ),
    ).toBe(true);
    expect(
      compareCustom(
        new Map([[inst, new Set([x])]]),
        new Map([[inst, new Set()]]),
      ),
    ).toBe(false);

    // Literal objects are compared by contents, recursively
    expect(compareCustom({ a: [x] }, { a: [x] })).toBe(true);
    expect(compareCustom(x, y)).toBe(true);
    expect(compareCustom({ a: [x] }, { a: [y] })).toBe(true);
    expect(compareCustom({ a: 1 }, { a: 1, b: 1 })).toBe(false);
    expect(compareCustom({ a: undefined }, { b: undefined })).toBe(false);

    // Same semantics as mobx's default comparer for primitives
    expect(compareCustom(NaN, NaN)).toBe(true);
    expect(compareCustom(0, -0)).toBe(false);
    expect(compareCustom([NaN], [NaN])).toBe(true);

    // Holes in sparse arrays are compared as undefined
    expect(compareCustom(new Array(1), ["ok"])).toBe(false);
    expect(compareCustom(["ok"], new Array(1))).toBe(false);
    expect(compareCustom(new Array(1), [undefined])).toBe(true);

    // Map order doesn't matter, but keys are compared by identity
    expect(
      compareCustom(
        new Map<unknown, number>([
          [inst, 1],
          ["k", 2],
        ]),
        new Map<unknown, number>([
          ["k", 2],
          [inst, 1],
        ]),
      ),
    ).toBe(true);
    expect(compareCustom(new Map([[x, 1]]), new Map([[y, 1]]))).toBe(false);
    expect(compareCustom(new Map([[inst, 1]]), new Map([[inst, 2]]))).toBe(
      false,
    );
    // Set members are compared by identity, even literal objects
    expect(compareCustom(new Set([x]), new Set([y]))).toBe(false);

    // Different kinds of collection are never equal
    expect(compareCustom([], new Set())).toBe(false);
    expect(compareCustom(new Map(), {})).toBe(false);
  });
});
