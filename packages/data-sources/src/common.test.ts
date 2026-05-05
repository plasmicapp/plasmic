import { describe, expect, it } from "vitest";
import {
  tagPlasmicUndefinedDataErrorPromise,
  throwIfPlasmicUndefinedDataError,
} from "./common";

describe("throwIfPlasmicUndefinedDataError", () => {
  it("rethrows PlasmicUndefinedDataError promises", () => {
    const promise = Promise.resolve();
    tagPlasmicUndefinedDataErrorPromise(promise);

    let thrown: unknown;
    try {
      throwIfPlasmicUndefinedDataError(promise);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBe(promise);
  });

  it("ignores normal errors", () => {
    expect(() =>
      throwIfPlasmicUndefinedDataError(new Error("normal error"))
    ).not.toThrow();
  });
});
