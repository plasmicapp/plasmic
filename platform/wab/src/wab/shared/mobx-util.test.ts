import {
  clearGlobalObservable,
  makeGlobalObservable,
  maybeComputedFn,
  mutateGlobalObservable,
} from "@/wab/shared/mobx-util";
import { configure, observable } from "mobx";

describe("Global Observable", () => {
  beforeAll(() => {
    configure({ enforceActions: "never" });
  });
  it("works with maybeComputedFn when created before", () => {
    makeGlobalObservable();
    let runCounter = 0;
    const fixedObservable = observable.box(0);
    const cachedFn = maybeComputedFn((_) => {
      runCounter = runCounter + 1;
    });
    cachedFn(fixedObservable);
    cachedFn(fixedObservable);
    mutateGlobalObservable();
    cachedFn(fixedObservable);
    cachedFn(fixedObservable);
    expect(runCounter).toBe(2);
  });

  it("does not work with maybeComputedFn when not created", () => {
    let runCounter = 0;
    const fixedObservable = observable.box(0);
    const cachedFn = maybeComputedFn((_) => {
      runCounter = runCounter + 1;
    });
    cachedFn(fixedObservable);
    cachedFn(fixedObservable);
    mutateGlobalObservable();
    cachedFn(fixedObservable);
    cachedFn(fixedObservable);
    expect(runCounter).toBe(1);
  });

  afterEach(() => {
    clearGlobalObservable();
  });
});
