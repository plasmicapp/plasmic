import { failure, IFailable, success } from "ts-failable";

export function unwrap<Result, Error>(
  result: IFailable<Result, Error>
): Result {
  if (result.result.isError) {
    throw new Error();
  } else {
    return result.result.value;
  }
}

export function someSuccess<Result, Error>(
  ...checks: IFailable<Result, Error>[]
): IFailable<Result, Error[]> {
  const errors: Error[] = [];
  for (const check of checks) {
    if (!check.result.isError) {
      return success(check.result.value);
    } else {
      errors.push(check.result.error);
    }
  }
  return failure(errors);
}

export function firstError<Result, Error>(check: IFailable<Result, Error[]>) {
  return check.mapError((errs) => errs[0]);
}

export function firstResult<Result, Error>(check: IFailable<Result[], Error>) {
  return check.map((results) => results[0]);
}

export function allSuccess<Result, Error>(
  ...checks: IFailable<Result, Error>[]
): IFailable<Result[], Error> {
  const results: Result[] = [];
  for (const check of checks) {
    if (check.result.isError) {
      return failure(check.result.error);
    } else {
      results.push(check.result.value);
    }
  }
  return success(results);
}

export function mapSomeSuccess<T, Result, Error>(
  arr: ReadonlyArray<T>,
  fn: (t: T) => IFailable<Result, Error>
): IFailable<Result, Error[]> {
  return someSuccess(...arr.map(fn));
}

export function mapAllSuccess<T, Result, Error>(
  arr: ReadonlyArray<T>,
  fn: (t: T) => IFailable<Result, Error>
): IFailable<Result[], Error> {
  return allSuccess(...arr.map(fn));
}
