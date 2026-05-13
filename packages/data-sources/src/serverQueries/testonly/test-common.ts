import { expect } from "vitest";
import { isPlasmicUndefinedDataErrorPromise } from "../../common";
import type { PlasmicQueryResult } from "../types";

export const asyncFuncCalls: {
  args: unknown[];
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}[] = [];
export const asyncFunc = (...args: unknown[]) => {
  return new Promise((resolve, reject) => {
    asyncFuncCalls.push({ args, resolve, reject });
  });
};

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return (
      aKeys.length === bKeys.length &&
      aKeys.every((k) => (a as any)[k] === (b as any)[k])
    );
  }
  return false;
}

/**
 * Find the first call whose arguments match the given args using shallow equality.
 * For example, [1] matches [1] or [1, 2] but not [2, 1].
 * Arrays and objects are compared shallowly, so findAsyncFuncCall(["a", "b"])
 * matches a call made with asyncFunc(["a", "b"]).
 */
export function findAsyncFuncCall(...args: unknown[]) {
  const found = asyncFuncCalls.find((call) =>
    args.every((arg, i) => shallowEqual(call.args[i], arg))
  );
  if (!found) {
    throw new Error(
      `Could not find async call with args: ${args
        .map((p) => JSON.stringify(p))
        .join(", ")}`
    );
  }
  return found;
}

export function expectQueryResolved<T>(
  $query: PlasmicQueryResult<T>,
  expected: T
) {
  expect(() => $query.data).not.toThrow();
  expect($query.data).toEqual(expected);
  expect($query.isLoading).toEqual(false);
}

export function expectQueryRejected<T>(
  $query: PlasmicQueryResult<T>,
  expected: string
) {
  expect(() => $query.data).toThrowError(expected);
  expect($query.isLoading).toEqual(false);
}

export function expectQueryLoading($query: PlasmicQueryResult) {
  // chai doesn't support matching Promises with a message property
  // https://github.com/chaijs/chai/issues/1752
  let data: unknown | undefined = undefined;
  try {
    data = $query.data;
  } catch (err) {
    if (isPlasmicUndefinedDataErrorPromise(err)) {
      expect(err.message).toEqual("Query is not done");
    } else {
      expect.fail(
        `$query.data threw non-PlasmicUndefinedDataErrorPromise: ${err}`
      );
    }
  }
  if (data !== undefined) {
    expect.fail(
      `$query.data should throw PlasmicUndefinedDataErrorPromise but returned: ${data}`
    );
  }

  expect($query.isLoading).toEqual(true);
}
