import {
  StatefulQueryResult,
  unwrapStatefulQueryResult,
} from "@/wab/shared/core/custom-functions";

describe("unwrapStatefulQueryResult", () => {
  it("returns loading true in initial state", () => {
    const result = new StatefulQueryResult();
    expect(unwrapStatefulQueryResult(result)).toEqual({
      isLoading: true,
      data: undefined,
      error: expect.any(Promise),
    });
  });

  it("returns loading true when loading", () => {
    const result = new StatefulQueryResult();
    result.loadingPromise("my-key", { then: () => {} } as Promise<unknown>);
    expect(unwrapStatefulQueryResult(result)).toEqual({
      isLoading: true,
      data: undefined,
      error: expect.any(Promise),
    });
  });

  it("returns data when query resolved", () => {
    const result = new StatefulQueryResult();
    result.resolvePromise("my-key", { rows: [1, 2, 3] });
    expect(unwrapStatefulQueryResult(result)).toEqual({
      isLoading: false,
      data: { rows: [1, 2, 3] },
      error: undefined,
    });
  });

  it("returns error when query rejected", () => {
    const result = new StatefulQueryResult();
    const err = new Error("HttpError: 404");
    result.rejectPromise("my-key", err);
    expect(unwrapStatefulQueryResult(result)).toEqual({
      isLoading: false,
      data: undefined,
      error: err,
    });
  });
});
