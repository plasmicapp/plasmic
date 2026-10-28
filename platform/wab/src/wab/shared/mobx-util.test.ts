import {
  disposeOwnedComputedFns,
  keyedComputedFn,
  maybeComputedFn,
  ownedComputedFn,
} from "@/wab/shared/mobx-util";
import { configure, observable, onBecomeUnobserved } from "mobx";

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
