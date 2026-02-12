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

/**
 * Find the first call whose arguments match the given args.
 * For example, [1] matches [1] or [1, 2] but not [2, 1].
 */
export function findAsyncFuncCall(...args: unknown[]) {
  const found = asyncFuncCalls.find((call) =>
    args.every((arg, i) => call.args[i] === arg)
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
