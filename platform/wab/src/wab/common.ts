import { ButLast, Constructor, Falsy, Last } from "@/wab/commons/types";
import origCx from "classnames";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import * as Immutable from "immutable";
import type { MemoizedFunction } from "lodash";
import {
  Truthy,
  assignIn,
  assignWith,
  camelCase,
  clamp,
  dropRight,
  flattenDeep,
  identity,
  isArray,
  isBoolean,
  isDate,
  isElement,
  isEmpty,
  isFunction,
  isNil,
  isNumber,
  isObject,
  isString,
  chunk as lodashChunk,
  get as lodashGet,
  range as lodashRange,
  memoize,
  mergeWith,
  pickBy,
  reverse,
  split,
  takeWhile,
  uniqBy,
  uniqueId,
  upperFirst,
  words,
  zip,
} from "lodash";
import { nanoid } from "nanoid";
import { Key } from "react";
import ShortUuid from "short-uuid";
import { inspect as utilInspect } from "util";
import { v4 as Uuidv4 } from "uuid";

const reAll = require("regexp.execall");

export type Cancelable<T> = { promise: Promise<T>; cancel(): void };

/**
 * TypeScript version of @istarkov's cancellable Promise wrapper.
 *
 * @see https://github.com/facebook/react/issues/5465#issuecomment-157888325
 */
export const makeCancelable = <T>(promise: Promise<T>): Cancelable<T> => {
  let hasCanceled = false;

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise.then(
      (value) => (hasCanceled ? reject({ isCanceled: true }) : resolve(value)),
      (error) => (hasCanceled ? reject({ isCanceled: true }) : reject(error))
    );
  });

  return {
    promise: wrappedPromise,
    cancel(): void {
      hasCanceled = true;
    },
  };
};

export const mapify = <T>(object: { [k: string]: T }) =>
  new Map(Object.entries(object));

export const demapify = <V>(map: Map<PropertyKey, V>) =>
  Object.fromEntries([...map.entries()]);

export function isBrowser() {
  return !process.argv?.length;
}

export function prettyJson<T>(x: T, deep = false) {
  return utilInspect(x, { depth: deep ? null : 3, colors: true });
}

export function inspect<T>(x: T, deep?: boolean): T {
  if (deep == null) {
    deep = false;
  }
  if (isBrowser()) {
    console.log(x);
  } else {
    console.log(maybes(x)((y) => (y as any).constructor)((z) => z.name)());
    console.log(prettyJson(x, deep));
  }
  return x;
}

export function trace(...args) {
  const adjustedLength = Math.max(args.length, 1),
    output = args.slice(0, adjustedLength - 1),
    f = args[adjustedLength - 1];
  console.log("enter", ...[...output]);
  const _res = f();
  return console.log("exit", ...[...output]);
}

export function generator(xs) {
  let i = -1;
  return function () {
    i += 1;
    if (i >= xs.length) {
      throw new Error(`index ${i} exceeds length of sequence (${xs.length})`);
    }
    return xs[i];
  };
}

export function selectiveJson(x, opts) {
  const type = x != null ? x.constructor.name : undefined;
  if (Array.isArray(x)) {
    return [...x].map((a) => selectiveJson(a, opts));
  } else if (isNumber(x) || isString(x) || x == null) {
    return x;
  } else if (x.constructor === Object) {
    return x;
  } else {
    const fields = opts[type];
    return Object.fromEntries(
      [...(fields != null ? fields : [])].map((f: string) =>
        tuple(f, selectiveJson(x[f], opts))
      )
    );
  }
}

export interface TypeStamped<T> extends Function {
  getType(): T;
  modelTypeName: string;
  isKnown(x: any): x is T;
}

// Cannot make this tightly typed.  One issue: https://github.com/Microsoft/TypeScript/issues/5843
export class Switcher<R> {
  _x: any;
  _result: any;
  _matched: boolean;
  _types: any[];
  constructor(_x) {
    this._x = _x;
    this._result = null;
    this._matched = false;
    this._types = [];
  }
  when<T, R1>(types: TypeStamped<T>, f: (x: T) => R1): Switcher<R | R1>;
  when<T extends string, R1>(
    types: Constructor<T>,
    f: (x: string) => R1
  ): Switcher<R | R1>;
  when<T, R1>(types: Constructor<T>, f: (x: T) => R1): Switcher<R | R1>;
  when<R1>(types: null, f: (x: null) => R1): Switcher<R | R1>;
  when<R1>(types: undefined, f: (x: undefined) => R1): Switcher<R | R1>;
  // Unfortunately TS has no way to accept a type param that is an abstract class.
  // { new(...args: any[]): T } only works for concrete types.
  // See https://github.com/Microsoft/TypeScript/issues/5843
  // This is a hack that uses a special type Abstract to denote abstract classes,
  // so you can say e.g.: when(Abstract(TplNode), tpl => ...)
  // when<T, R1>(types: Abstract<T>, f: (x: T) => R1): Switcher<R | R1>;
  when<T, U, R1>(
    types: [Constructor<T>, Constructor<U>],
    f: (x: T | U) => R1
  ): Switcher<R | R1>;
  when<T, U, V, R1>(
    types: [Constructor<T>, Constructor<U>, Constructor<V>],
    f: (x: T | U | V) => R1
  ): Switcher<R | R1>;
  when<T, U, V, W, R1>(
    types: [Constructor<T>, Constructor<U>, Constructor<V>, Constructor<W>],
    f: (x: T | U | V | W) => R1
  ): Switcher<R | R1>;
  when<T, U, V, W, X, R1>(
    types: [
      Constructor<T>,
      Constructor<U>,
      Constructor<V>,
      Constructor<W>,
      Constructor<X>
    ],
    f: (x: T | U | V | W | X) => R1
  ): Switcher<R | R1>;
  // type can be null/undefined, which will just check for null/undefined
  when<R1>(types: any, f: (x: any) => R1): Switcher<R | R1> {
    if (!this._matched) {
      const isArr = Array.isArray(types);
      const matches: boolean = isArr
        ? types.some((t) => matchesType(this._x, t))
        : matchesType(this._x, types);
      if (matches) {
        this._result = f(this._x);
        this._matched = true;
      } else {
        if (isArr) {
          this._types.push(...types);
        } else {
          this._types.push(types);
        }
      }
    }
    return this;
  }
  else<R1>(value: () => R1): R | R1 {
    if (!this._matched) {
      this._matched = true;
      return value();
    } else {
      return this._result;
    }
  }
  result(): R {
    if (this._matched) {
      return this._result;
    } else {
      throw new UnexpectedTypeError(
        this._x,
        this._types.filter((t) => t != null)
      );
    }
  }
}

function matchesType(val: any, type: any) {
  if (type == null) {
    return val == null;
  } else {
    return (
      val instanceof type ||
      (type === String && isString(val)) ||
      (type === Function && isFunction(val)) ||
      (type != null && "isKnown" in type && type.isKnown(val))
    );
  }
}

/**
 * @deprecated Please use switchType instead
 */
export const switchTypeUnsafe = (x: any) => new Switcher<never>(x);

interface Resulter<Result> {
  result(): Result;
}

type SwitcherOrResult<RemainingInput, Result> = [RemainingInput] extends [never]
  ? Resulter<Result>
  : ModelSwitcher<RemainingInput, Result>;

class ModelSwitcher<RemainingInput, Result = never> {
  constructor(
    private _x: RemainingInput,
    private _matched: boolean,
    private _result: Result = undefined as any,
    private _types: any[] = []
  ) {}

  when<Case extends RemainingInput, NewResult>(
    type: TypeStamped<Case>,
    fn: (x: Case) => NewResult
  ): SwitcherOrResult<Exclude<RemainingInput, Case>, Result | NewResult>;
  when<Case extends RemainingInput, NewResult>(
    type: Constructor<Case>,
    fn: (x: Case) => NewResult
  ): SwitcherOrResult<Exclude<RemainingInput, Case>, Result | NewResult>;
  when<Case extends RemainingInput, Case2 extends RemainingInput, NewResult>(
    types: [TypeStamped<Case>, TypeStamped<Case2>],
    fn: (x: Case | Case2) => NewResult
  ): SwitcherOrResult<
    Exclude<RemainingInput, Case | Case2>,
    Result | NewResult
  >;
  when<Case extends RemainingInput, Case2 extends RemainingInput, NewResult>(
    types: [Constructor<Case>, Constructor<Case2>],
    fn: (x: Case | Case2) => NewResult
  ): SwitcherOrResult<
    Exclude<RemainingInput, Case | Case2>,
    Result | NewResult
  >;
  when<
    Case extends RemainingInput,
    Case2 extends RemainingInput,
    Case3 extends RemainingInput,
    NewResult
  >(
    types: [TypeStamped<Case>, TypeStamped<Case2>, TypeStamped<Case3>],
    fn: (x: Case | Case2 | Case3) => NewResult
  ): SwitcherOrResult<
    Exclude<RemainingInput, Case | Case2 | Case3>,
    Result | NewResult
  >;
  when<
    Case extends RemainingInput,
    Case2 extends RemainingInput,
    Case3 extends RemainingInput,
    NewResult
  >(
    types: [Constructor<Case>, Constructor<Case2>, Constructor<Case3>],
    fn: (x: Case | Case2 | Case3) => NewResult
  ): SwitcherOrResult<
    Exclude<RemainingInput, Case | Case2 | Case3>,
    Result | NewResult
  >;
  when<
    Cases extends Array<Constructor<RemainingInput>>,
    Case extends Cases extends Array<Constructor<infer R>> ? R : never,
    NewResult
  >(
    types: Cases,
    fn: (x: Case) => NewResult
  ): SwitcherOrResult<Exclude<RemainingInput, Case>, Result | NewResult>;
  // eslint-disable-next-line @typescript-eslint/ban-types
  when<Case extends RemainingInput & Object, NewResult>(
    types: typeof Object,
    fn: (x: Case) => NewResult
  ): SwitcherOrResult<Exclude<RemainingInput, Case>, Result | NewResult>;
  when<Case extends RemainingInput & string, NewResult>(
    types: typeof String,
    fn: (x: Case) => NewResult
  ): SwitcherOrResult<Exclude<RemainingInput, Case>, Result | NewResult>;
  when<Case extends RemainingInput & (null | undefined), NewResult>(
    types: null | undefined,
    fn: (x: Case) => NewResult
  ): SwitcherOrResult<Exclude<RemainingInput, Case>, Result | NewResult>;
  when<
    Case extends RemainingInput,
    Case2 extends RemainingInput,
    Case3 extends RemainingInput,
    NewResult
  >(
    maybeTypes: any,
    fn: (x: Case | Case2 | Case3) => NewResult
  ): SwitcherOrResult<Exclude<RemainingInput, Case>, Result | NewResult> {
    if (!this._matched) {
      const types = maybeTypes;
      const isArr = Array.isArray(types);
      const matches: boolean = isArr
        ? types.some((t) => matchesType(this._x, t))
        : matchesType(this._x, types);
      if (matches) {
        this._result = fn(this._x as any) as any;
        this._matched = true;
      } else {
        if (isArr) {
          this._types.push(...types);
        } else {
          this._types.push(types);
        }
      }
    }
    return this as any;
  }

  /**
   * This is lax. You could end up writing switchType(tplTag).when(TplNode)
   */
  whenUnsafe<Case, NewResult>(
    types: TypeStamped<Case>,
    fn: [RemainingInput & Case] extends [never] ? never : (x: Case) => NewResult
  ): SwitcherOrResult<Exclude<RemainingInput, Case>, Result | NewResult>;
  /**
   * This is lax. You could end up writing switchType(tplTag).when(TplNode)
   */
  whenUnsafe<Case, NewResult>(
    types: Constructor<Case>,
    fn: [RemainingInput & Case] extends [never] ? never : (x: Case) => NewResult
  ): SwitcherOrResult<Exclude<RemainingInput, Case>, Result | NewResult>;
  /**
   * This is lax. You could end up writing switchType(tplTag).when(TplNode)
   */
  whenUnsafe<Case, Case2, NewResult>(
    types: [Constructor<Case>, Constructor<Case2>],
    fn: [RemainingInput & (Case | Case2)] extends [never]
      ? never
      : (x: Case | Case2) => NewResult
  ): SwitcherOrResult<
    Exclude<RemainingInput, Case | Case2>,
    Result | NewResult
  >;
  whenUnsafe<
    Case extends RemainingInput,
    Case2 extends RemainingInput,
    Case3 extends RemainingInput,
    NewResult
  >(
    maybeTypes: any,
    fn: (x: Case | Case2 | Case3) => NewResult
  ): SwitcherOrResult<Exclude<RemainingInput, Case>, Result | NewResult> {
    return this.when(maybeTypes, fn) as any;
  }

  elseUnsafe<NewResult>(fn: () => NewResult): Result | NewResult {
    return this._matched ? this._result : fn();
  }

  private result() {
    if (this._matched) {
      return this._result;
    } else {
      throw new UnexpectedTypeError(
        this._x,
        this._types.filter((t) => t != null)
      );
    }
  }
}

export function switchType<T>(x: T) {
  return new ModelSwitcher(x, false);
}

export class CustomError extends Error {
  name: string;
  constructor(msg?: string) {
    super(msg);
    // doesn't quite work; from <https://github.com/jaekwon/lessons/blob/master/coffeescript/errors.coffee>
    this.name = this.constructor.name;
    ({ message: this.message, stack: this.stack } = this);
  }
}
export class NotImplementedError extends CustomError {
  constructor(msg = "Not implemented") {
    super(msg);
  }
}
export class UnexpectedTypeError extends CustomError {
  constructor(actualInstance, expectedTypes) {
    super(
      (() => {
        if (!Array.isArray(expectedTypes)) {
          expectedTypes = [expectedTypes];
        }
        return mkUnexpectedTypeMsg(expectedTypes, actualInstance);
      })()
    );
  }
}
export class AssertionError extends CustomError {
  constructor(msg = "Assertion failed") {
    super(msg);
  }
}
export class KeyError extends CustomError {}
export class AbstractMethodError extends CustomError {}
export class InvalidCodePathError extends CustomError {}
export class NullOrUndefinedValueError extends CustomError {}
export class FalsyValueError extends CustomError {}
export class HarmlessError extends CustomError {}

export function todo(msg?: string): never {
  debugger;
  throw new NotImplementedError(msg);
}
// just symbolic of TODO, but this can at least be turned into something that warns or raises an error in a dynamic code path
export const softTodo = (_msg?: string) => null;

export const doWith = <T, V>(ctx: T, fn: () => V): V => fn.call(ctx);

export type StringGen = string | (() => string);

/**
 * @deprecated Please use the version with a message for better debugging info
 * and bug tracking on Sentry
 */
export function assert<T>(cond: T): asserts cond;
/**
 * Asserts condition
 * @param cond
 * @param msg
 */
export function assert<T>(cond: T, msg: StringGen): asserts cond;
/**
 * Asserts condition
 * @param cond
 * @param msg
 */
export function assert<T>(
  cond: T,
  msg: StringGen = "Assertion failed"
): asserts cond {
  if (!cond) {
    // We always generate an non empty message so that it doesn't get swallowed
    // by the async library.
    msg = (isString(msg) ? msg : msg()) || "Assertion failed";
    debugger;
    throw new AssertionError(msg);
  }
}

export function check<U>(value: U, msg: StringGen = "") {
  assert(value, msg);
  return value;
}

export function unexpected(msg: StringGen = ""): never {
  debugger;
  throw new InvalidCodePathError(
    !msg ? undefined : isString(msg) ? msg : msg()
  );
}

/**
 * Like unexpected, but will really create a type error if it is
 * reachable. Suitable for default branch of a switch of if/else
 * statement.  The argument to `unreachable()` should be the thing
 * that you have exhaustively checked for.
 */
export function unreachable(thing: never): never;
export function unreachable(thing: any) {
  throw new InvalidCodePathError(`Did not expect ${thing}`);
}

export const mkMap = () => Object.create(null);

export function revNthWhere<T>(
  xs: T[],
  n: number,
  f: (x: T) => boolean
): [null | T, number] {
  for (let i = xs.length - 1; i >= 0; i--) {
    if (f(xs[i]) && (n -= 1) < 0) {
      return tuple(xs[i], i);
    }
  }
  return tuple(null, -1);
}

export const removeAt = <T>(xs: T[], i: number) => xs.splice(i, 1)[0];

export function tryRemove<T>(xs: T[], x: T) {
  const i = xs.indexOf(x);
  if (i >= 0) {
    removeAt(xs, i);
  }
  return i;
}

export function remove<T>(xs: T[], x: T): number {
  const i = tryRemove(xs, x);
  if (i < 0) {
    debugger;
    throw new Error("could not find element in array to remove");
  }
  return i;
}

export function removeWhere<T>(xs: T[], f: (x: T) => boolean) {
  const indices = lodashRange(xs.length).filter((i) => f(xs[i]));
  removeAtIndexes(xs, indices);
  return xs;
}

export function isSubList<T>(list: T[], maybeSubList: T[]) {
  return maybeSubList.every((x) => list.includes(x));
}

/**
 * A version of arr.includes() that enforces that the argument array
 * is a subset of union T.
 *
 *   type Alphabet = "a"|"b"|"c"
 *   function check(x: Alphabet) {
 *     isOneOf(x, ["a", "b", "3"])) // typecheck error
 *     isOneOf(x, ["a", "b"])) // is fine
 *     ["a", "b"].includes(x) // typecheck error :-/ hence isOneOf!
 *   }
 */
export function isOneOf<T, U extends T>(elem: T, arr: readonly U[]): elem is U {
  return arr.includes(elem as any);
}

export function reverseIf(condition: boolean, arr: any[]) {
  return condition ? reverse(arr) : arr;
}

export const lastWhere = <T>(xs: T[], f: (x: T) => boolean) =>
  revNthWhere(xs, 0, f);

export function nthWhere<T>(
  xs: T[],
  n: number,
  f: (x: T, i: number) => boolean
): [T | null, number] {
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    if (f(x, i) && (n -= 1) < 0) {
      return tuple(x, i);
    }
  }
  return tuple(null, -1);
}

export function maybe<T, U>(
  x: T | undefined | null,
  f: (y: T) => U
): U | undefined {
  if (x === undefined || x === null) {
    return undefined;
  }
  return f(x);
}

export function maybeInstance<T>(x: any, cls: Constructor<T>): T | undefined;
export function maybeInstance<T, U>(
  x: any,
  cls: Constructor<T>,
  f: (y: T) => U
): U | undefined;
export function maybeInstance<T, U>(
  x: any,
  cls: Constructor<T>,
  f?: (y: T) => any
): U | undefined {
  f = f || strictIdentity;
  if (x instanceof cls) {
    return f(x);
  } else {
    return undefined;
  }
}

/**
 * Ensures given array has 0 or 1 elements.
 */
export function maybeOne<T>(xs: T[]): T | undefined {
  // [][0] will also implicitly return undefined, but we're just being explicit
  if (xs.length === 0) {
    return undefined;
  }
  if (xs.length > 1) {
    throw new Error(`Expecting singular value, got ${xs}`);
  }
  return xs[0];
}

export function asOne<T>(xs: T | T[] | undefined): T | undefined {
  if (xs === undefined) {
    return undefined;
  } else if (Array.isArray(xs)) {
    return xs.length === 0 ? undefined : xs[0];
  } else {
    return xs;
  }
}

export function assertAtMostOne<T>(
  xs: T | T[] | undefined | null
): T | undefined {
  if (xs === undefined || xs === null) {
    return undefined;
  } else if (Array.isArray(xs)) {
    return maybeOne(xs);
  } else {
    return xs;
  }
}

export const firstWhere = <T>(xs: T[], f: (x: T, i: number) => boolean) =>
  nthWhere(xs, 0, f);

export const withoutNils = <T>(xs: Array<T | undefined | null>): T[] =>
  xs.filter((x): x is T => x != null);

export const withoutFalsy = <T>(xs: Array<T | Falsy>): T[] =>
  xs.filter((x): x is T => !!x);

export const withoutNilTuples = <K, V>(
  tups: Array<[K, V | undefined | null]>
): Array<[K, V]> => tups.filter((tup): tup is [K, V] => notNil(tup[1]));

export const omitNils = <V>(x: {
  [k: string]: V | null | undefined;
}): { [k: string]: V } => pickBy(x, (y): y is V => y != null);

export const xOmitNils = <K, V>(x: Map<K, V | undefined | null>): Map<K, V> => {
  const map = new Map<K, V>();
  for (const [k, v] of x.entries()) {
    if (v != null) {
      map.set(k, v);
    }
  }
  return map;
};

export const undefinedToDefault = <K, V>(
  x: Map<K, V | undefined | null>,
  defaultValue: V
): Map<K, V> => {
  const map = new Map<K, V>();
  for (const [k, v] of x.entries()) {
    if (v === null || v === undefined) {
      map.set(k, defaultValue);
    } else {
      map.set(k, v);
    }
  }
  return map;
};

export const zeroWidthSpace = "\u200B";

export function multimap<K, V>(pairs: Iterable<[K, V]>): Map<K, V[]> {
  const map = new Map();
  for (const [k, v] of [...pairs]) {
    if (!map.has(k)) {
      map.set(k, []);
    }
    map.get(k).push(v);
  }
  return map;
}

// Similar to Python's zip(), which just truncates to the shortest of the given
// arrays.
export function shortZip<A, B>(xs: ReadonlyArray<A>, ys: ReadonlyArray<B>) {
  const minLen = Math.min(xs.length, ys.length);
  return range(0, minLen, false).map((i) => tuple(xs[i], ys[i]));
}

export function literalToEnum<Enum extends string>(v: `${Enum}`) {
  return v as Enum;
}

/**
 * Interleave two arrays, returning [xs[0], ys[0], xs[1], ys[1], ...].
 *
 * Truncated to length of the first argument.
 */
export function interleave<T>(xs: ReadonlyArray<T>, ys: ReadonlyArray<T>): T[] {
  if (xs.length !== ys.length && xs.length !== ys.length + 1) {
    throw new Error("xs must be same length or one more element than ys");
  }
  function* gen() {
    for (const i of lodashRange(xs.length)) {
      yield xs[i];
      if (i < ys.length) {
        yield ys[i];
      }
    }
  }
  return Array.from(gen());
}

type List<T> = ArrayLike<T>;
type RecursiveArray<T> = Array<T | RecursiveArray<T>>;
type ListOfRecursiveArraysOrValues<T> = List<T | RecursiveArray<T>>;

export const flexFlatten = <T>(xs: ListOfRecursiveArraysOrValues<T>) =>
  withoutNils(flattenDeep(xs));

// A better, more flexible version utility like cx for preparing className for
// React
export const cx = (...xs) =>
  origCx(
    assignIn(
      {},
      ...[
        ...((() => {
          return [
            ...(function* () {
              for (const x of [...flexFlatten(xs)]) {
                if (isObject(x)) {
                  yield x;
                } else if (isString(x)) {
                  yield Object.fromEntries([tuple(x, true)]);
                } else if (x) {
                  // Ignore falsy
                  throw new Error("unknown type for cx");
                }
              }
            })(),
          ];
        })() || []),
      ]
    )
  );

type SwallowParams = { etypes?: Function[]; warn?: boolean };

export function swallow<T>(f: () => T): T | null;
export function swallow<T>(opts: SwallowParams, f: () => T): T | null;
export function swallow<T>(
  a: (() => T) | SwallowParams,
  b?: () => T
): T | null {
  const [f, { etypes = undefined, warn = false } = {}] = b
    ? tuple(b, a as SwallowParams)
    : tuple(a as () => T, undefined);
  try {
    return f();
  } catch (e) {
    if (warn) {
      console.warn(e);
    }
    if (!etypes || etypes.some((etype) => e instanceof etype)) {
      return null;
    }
    throw e;
  }
}

export function maybeSwallow<T>(cond: boolean, fn: () => T): T | null {
  if (cond) {
    return swallow(fn);
  } else {
    return fn();
  }
}

export function maybeTry<T, U>(
  cond: boolean,
  fn: () => T,
  catcher: (error: any) => U
): T | U | null {
  if (cond) {
    try {
      return fn();
    } catch (e) {
      return catcher(e);
    }
  } else {
    return fn();
  }
}

/**
 * NOTE this returns undefined, unlike the null from swallow()!
 */
export async function swallowAsync<T>(f: Promise<T>): Promise<T | undefined>;
export async function swallowAsync<T>(
  etypes: Function[],
  f: Promise<T>
): Promise<T | undefined>;
export async function swallowAsync<T>(
  a: Promise<T> | Function[],
  b?: Promise<T>
): Promise<T | undefined> {
  const [promise, etypes] = b
    ? tuple(b, a as Function[])
    : tuple(a as Promise<T>, null);
  try {
    return await promise;
  } catch (e) {
    if (etypes == null || [...etypes].some((etype) => e instanceof etype)) {
      return undefined;
    }
    throw e;
  }
}

export const insert = <T>(xs: T[], i: number, x: T) => {
  xs.splice(i, 0, x);
  return xs;
};

// #ae9 -> #aaee99
export function fullRgb(rgb) {
  if (rgb.length === 4) {
    const [_hash, r, g, b] = [...rgb.split("")];
    return `#${[r, r, g, g, b, b].join("")}`;
  } else {
    return rgb;
  }
}

export function parsePx(x: string) {
  if (x.length === 0) {
    return 0;
  }
  return +ensure(/^(-?[0-9.]+)px$/.exec(x), `${x} is not a valid px value`)[1];
}

export function get<T>(map: { [k: string]: T }, key: string) {
  if (!(key in map)) {
    throw new KeyError(`key not found in map: ${key}`);
  }
  return map[key];
}

export const pushAll = <T>(xs: T[], ys: T[]) =>
  xs.splice(xs.length, 0, ...[...ys]);

export function replace<T>(xs: T[], q: T, r: T) {
  xs[xs.indexOf(q)] = r;
  return xs;
}

export function replaceMultiple<T>(xs: T[], q: T, rs: T[]) {
  xs.splice(xs.indexOf(q), 1, ...rs);
  return xs;
}

export function replaceAll<T>(xs: T[], ys: T[]) {
  return xs.splice(0, xs.length, ...[...ys]);
}

export function replaceSet<T>(target: Set<T>, source: Set<T>) {
  for (const key of source.keys()) {
    if (!target.has(key)) {
      target.add(key);
    }
  }
  for (const key of target.keys()) {
    if (!source.has(key)) {
      target.delete(key);
    }
  }
}

export function replaceMap<K, V>(target: Map<K, V>, source: Map<K, V>) {
  for (const [k, v] of source.entries()) {
    if (target.get(k) !== v) {
      target.set(k, v);
    }
  }
  for (const key of target.keys()) {
    if (!source.has(key)) {
      target.delete(key);
    }
  }
}

/**
 * Replaces content of x with content of y.
 */
export function replaceObj(x: any, y: any) {
  for (const key of Object.keys(x)) {
    if (!(key in y)) {
      delete x[key];
    }
  }
  for (const key of Object.keys(y)) {
    x[key] = y[key];
  }
}

export function strictZip<T, U>(
  xs: ReadonlyArray<T>,
  ys: ReadonlyArray<U>
): [T, U][];
export function strictZip<T, U, V>(
  xs: ReadonlyArray<T>,
  ys: ReadonlyArray<U>,
  zs: ReadonlyArray<V>
): [T, U, V][];
export function strictZip<T>(...arrays: ReadonlyArray<T>[]): T[][] {
  check(new Set(arrays.map((a) => a.length)).size === 1);
  return zip(...arrays) as T[][];
}

export function leftZip<T, U>(
  xs: ReadonlyArray<T>,
  ys: ReadonlyArray<U>
): [T, U][];
export function leftZip<T, U, V>(
  xs: ReadonlyArray<T>,
  ys: ReadonlyArray<U>,
  zs: ReadonlyArray<V>
): [T, U, V][];
export function leftZip<T>(
  left: ReadonlyArray<T>,
  ...arrays: ReadonlyArray<T>[]
): T[][] {
  return left.map((x, i) => [x, ...arrays.map((a) => a[i])]);
}

// also in es7 polyfill and lodash
export function uniqueKey(x: {}): string {
  if ((x as any).__uniqueKey__ == null) {
    Object.defineProperty(x, "__uniqueKey__", {
      configurable: false,
      enumerable: false,
      value: uniqueId(),
      writable: false,
    });
  }
  return (x as any).__uniqueKey__;
}

export function replaceWhere(xs, p, x) {
  xs[firstWhere(xs, p)[1]] = x;
  return xs;
}

export function xpick<K, V>(map: Map<K, V>, ...keys: K[]) {
  assert(
    keys.every((key) => map.has(key)),
    "common.xpick: every key should be in the map."
  );
  return new Map(keys.map((key) => tuple(key, map.get(key))));
}

export function xpickExists<K, V>(map: Map<K, V>, ...keys: K[]) {
  const submap = new Map<K, V>();
  for (const key of keys) {
    if (map.has(key)) {
      submap.set(key, map.get(key) as V);
    }
  }
  return submap;
}

export function xpickBy<K, V>(
  map: Map<K, V>,
  func: (val: V, key: K) => boolean
) {
  return new Map(
    Array.from(map.entries()).filter(([key, val]) => func(val, key))
  );
}

export function xMapValues<K, V1, V2>(
  map: Map<K, V1>,
  func: (v: V1, k: K) => V2
) {
  return new Map(
    Array.from(map.entries()).map(([key, val]) => [key, func(val, key)])
  );
}

export const xor = (a: boolean, b: boolean) => (!a && b) || (a && !b);

export function checkUnique<T, K = T>(xs: T[], key: (x: T) => K = identity) {
  const deduped = uniqBy(xs, key);
  check(deduped.length === xs.length);
  return deduped;
}

/**
 * Given a collection of names and a proposed new name, returns either the new
 * name if it's already unique among the collection, or increments the last
 * number in the name (appending one if doesn't exist), incrementing from 1
 * until it finds a unique name
 */
export function uniqueName(
  existingNames: string[],
  base: string,
  {
    separator = " ",
    normalize = identity,
  }: { separator?: string; normalize?: (x: string) => string } = {}
) {
  const existing = new Set(existingNames.map(normalize));
  if (!existing.has(normalize(base))) {
    return base;
  }
  let attempt = base;
  let num = 2;

  const tokens = split(base, separator);
  if (tokens.length > 0 && Number.isInteger(+last(tokens)!)) {
    base = dropRight(tokens).join(separator);
    num = +last(tokens)! + 1;
  }

  while (
    existing.has(normalize(attempt)) ||
    (num === 2 && existing.has(normalize(`${attempt}${separator}1`)))
  ) {
    attempt = `${base}${separator}${num++}`;
  }
  return attempt;
}

export const xInvert = <K, V>(map: Map<K, V>) =>
  new Map([...map.entries()].map(([k, v]) => tuple(v, k)));

export const xKeyBy = <K, V>(xs: V[], keyfn: (x: V) => K): Map<K, V> =>
  new Map(xs.map((x) => tuple(keyfn(x), x)));

/**
 * Returns everything that's in a but not in b (a minus b)
 */
export const xDifference = <T>(a: Iterable<T>, b: Iterable<T>) => {
  const bSet = new Set(b);
  return new Set([...a].filter((x) => !bSet.has(x)));
};

export function xSymmetricDifference<T>(
  leftSet: Iterable<T>,
  ancSet: Iterable<T>
) {
  return [...xDifference(leftSet, ancSet), ...xDifference(ancSet, leftSet)];
}

export function xOmit<K, V>(map: Map<K, V>, ...keys: K[]) {
  const clone = new Map(map);
  for (const k of [...keys]) {
    clone.delete(k);
  }
  return clone;
}

export function xExtend<K, V>(dst: Map<K, V>, ...srcs: Map<K, V>[]) {
  for (const src of [...srcs]) {
    for (const [k, v] of [...[...src]]) {
      dst.set(k, v);
    }
  }
  return dst;
}

export function xGroupBy<K, V>(list: V[], keyFunc: (v: V) => K) {
  const map = new Map<K, V[]>();
  for (const val of list) {
    const key = keyFunc(val);
    if (map.has(key)) {
      ensure(map.get(key), "Map.get returned nullish value").push(val);
    } else {
      map.set(key, [val]);
    }
  }
  return map;
}

export function longestCommonPrefix<T, K = T>(
  xs: T[],
  ys: T[],
  {
    key = identity,
    comparator = (x, y) => x === y,
  }: {
    key?: (x: T) => K;
    comparator?: (x: K, y: K) => boolean;
  } = {}
) {
  return takeWhile(shortZip(xs, ys), ([x, y]) =>
    comparator(key(x), key(y))
  ).map(([x, _y]) => x);
}

/**
 * @deprecated Please use the version with a message for better debugging info
 * and bug tracking on Sentry
 */
export function ensure<T>(x: T | null | undefined): T;
/**
 * Ensures value is not null or undefined
 * @param x
 * @param msg
 */
export function ensure<T>(x: T | null | undefined, msg: StringGen): T;
/**
 * Ensures value is not null or undefined
 * @param x
 * @param msg
 */
export function ensure<T>(x: T | null | undefined, msg: StringGen = ""): T {
  if (x === null || x === undefined) {
    debugger;
    msg = (isString(msg) ? msg : msg()) || "";
    throw new NullOrUndefinedValueError(
      `Value must not be undefined or null${msg ? `- ${msg}` : ""}`
    );
  } else {
    return x;
  }
}

export function isNonNil<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/**
 *
 * @param str iso string
 * @param extendedOnly boolean for extended mode (i.e. time)
 * @returns Returns true for strings in ISO 8601 format
 */
export function isValidIsoDate(str: string | undefined, extendedOnly = false) {
  if (!str) {
    return false;
  }
  if (typeof str !== "string") {
    return false;
  }
  if (str.includes(" ")) {
    return false;
  } // spaces not supported
  if (str.length === 10) {
    if (extendedOnly) {
      return false;
    }
    dayjs.extend(customParseFormat);
    return dayjs(str, "YYYY-MM-DD", true).isValid();
  }
  if (!dayjs(str).isValid()) {
    return false;
  } // should be a valid dayjs date
  if (isNaN(new Date(str).getTime())) {
    return false;
  } // should be a valid js date
  return true;
}

export function isTruthy<T>(value: T): value is Truthy<T> {
  return !!value;
}

export function ensureTruthy<T>(
  x: T | null | undefined,
  msg: StringGen = ""
): T {
  if (!x) {
    debugger;
    msg = (isString(msg) ? msg : msg()) || "";
    throw new FalsyValueError(`Value must be truthy${msg ? `- ${msg}` : ""}`);
  } else {
    return x;
  }
}

export function ensureNonEmpty<T>(xs: T[]): T[] {
  check(xs.length > 0);
  return xs;
}

export function strictFind<T>(xs: T[], pred: (cc: T) => boolean) {
  return ensure(xs.find(pred), "Failed to find");
}

export const iterator = (xs) => xs[Symbol.iterator]();

export const jsonClone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

// Based on <https://stackoverflow.com/questions/9064935/extending-multiple-classes-in-coffee-script>
export const proxy = (x, cls, field) => {
  for (const methodName of [...Object.getOwnPropertyNames(cls.prototype)]) {
    if (methodName !== "constructor") {
      ((method) =>
        (x.prototype[method] = function (...args) {
          return this[field][method](...[...(args || [])]);
        }))(methodName);
    }
  }
};

type Result<T, U> =
  | { type: "Success"; value: T }
  | { type: "Failure"; value: U };

/**
 * Implementation of Python's try/catch/else.
 */
export function tryCatchElse<Try, Catch, Else, Err = any>(opts: {
  try: () => Try;
  catch: (e: Err) => Catch;
  else: (x: Try) => Else;
}): Else | Catch;
export function tryCatchElse<Try, Catch, _Else, Err = any>(opts: {
  try: () => Try;
  catch: (e: Err) => Catch;
}): Try | Catch;
export function tryCatchElse<Try, Catch, Else, Err = any>(opts: {
  try: () => Try;
  catch: (e: Err) => Catch;
  else?: (x: Try) => Else;
}): Try | Catch | Else {
  const result: Result<Try, Catch> = ((): Result<Try, Catch> => {
    try {
      return { type: "Success", value: opts.try() };
    } catch (e) {
      return { type: "Failure", value: opts.catch(e) };
    }
  })();
  if (result.type === "Success") {
    if (opts.else) {
      return opts.else(result.value);
    } else {
      return result.value;
    }
  } else {
    return result.value;
  }
}

/**
 * Implementation of Python's try/catch/else.
 */
export async function tryCatchElseAsync<Try, Catch, Else, Err = any>(opts: {
  try: () => Promise<Try>;
  catch: (e: Err) => Promise<Catch>;
  else: (x: Try) => Promise<Else>;
}): Promise<Else | Catch>;
export async function tryCatchElseAsync<Try, Catch, _Else, Err = any>(opts: {
  try: () => Promise<Try>;
  catch: (e: Err) => Promise<Catch>;
}): Promise<Try | Catch>;
export async function tryCatchElseAsync<Try, Catch, Else, Err = any>(opts: {
  try: () => Promise<Try>;
  catch: (e: Err) => Promise<Catch>;
  else?: (x: Try) => Promise<Else>;
}): Promise<Try | Catch | Else> {
  const result: Result<Try, Catch> = await (async (): Promise<
    Result<Try, Catch>
  > => {
    try {
      return { type: "Success", value: await opts.try() };
    } catch (e) {
      return { type: "Failure", value: await opts.catch(e) };
    }
  })();
  if (result.type === "Success") {
    if (opts.else) {
      return opts.else(result.value);
    } else {
      return result.value;
    }
  } else {
    return result.value;
  }
}

export const isCurrentlyWithinPath = (path: string) =>
  window.location.pathname.startsWith(path);

export function unanimousVal<T>(xs: T[]): T | undefined {
  const set = new Set(xs);
  if (set.size === 1) {
    return xs[0];
  } else {
    return undefined;
  }
}

export function reSplitAll(pattern: RegExp, target: string) {
  return generate(function* () {
    let lastStart = 0;
    for (const match of [...reAll(pattern, target)] as any[]) {
      yield tuple(target.slice(lastStart, match.index), match);
      lastStart = match.index + match[0].length;
    }
    yield tuple(target.slice(lastStart), null);
  });
}

export const mkUuid = () => Uuidv4();

export const mkShortId = () => nanoid(12);

export const mkShortUuid = () => {
  return ShortUuid().fromUUID(mkUuid());
};

export function groupConsecBy<T, K>(
  xs: T[],
  f: (x: T, i: number) => K
): [K, T[]][] {
  const groups: [K, T[]][] = [];
  let group: null | T[] = null;
  let lastKey: null | K = null;
  let i = 0;
  for (const x of [...xs]) {
    const currKey = f(x, i++);
    if (group == null || currKey !== lastKey) {
      groups.push(tuple(currKey, (group = [])));
    }
    group.push(x);
    lastKey = currKey;
  }
  return groups;
}

export function rMaybe<T, U>(
  f: (y: T) => U,
  x: T | null | undefined
): U | undefined {
  return maybe(x, f);
}

// From <https://stackoverflow.com/questions/5202085/javascript-equivalent-of-pythons-rsplit>
export function rsplit(str: string, sep: string, maxsplit: number) {
  const res = str.split(sep);
  if (maxsplit) {
    return [res.slice(0, -maxsplit).join(sep)].concat(res.slice(-maxsplit));
  } else {
    return res;
  }
}

export function ensureArray<T>(x: T | T[] | undefined): T[] {
  if (x == null) {
    return [];
  } else if (Array.isArray(x)) {
    return x;
  } else {
    return [x];
  }
}

export function maybeArray<T, U>(xs: T, f: (ys: T) => U): U;
export function maybeArray<T, U>(xs: T[], f: (ys: T[]) => U[]): U[];
export function maybeArray<T, U>(xs: T[] | T, f: (ys: T[]) => U[]): U[] | U {
  if (Array.isArray(xs)) {
    return f(xs);
  } else {
    return f([xs])[0];
  }
}
export function trySingularize<T>(xs: T[]): T | T[] {
  if (xs.length === 1) {
    return xs[0];
  } else {
    return xs;
  }
}

export function only<T>(xs: T[]): T {
  if (xs.length !== 1) {
    throw new Error(`xs: ${xs}`);
  }
  return xs[0];
}

export const crunch = (x) => x.replace(/\s+/g, " ");

export function toggleSet<T>(set: Immutable.Set<T>, x: T) {
  if (set.has(x)) {
    return set.delete(x);
  } else {
    return set.add(x);
  }
}

// Backport
export function decapitalize(x: string) {
  if (x.length > 0) {
    return `${x[0].toLowerCase()}${x.slice(1)}`;
  } else {
    return "";
  }
}

export const checkDistinct = checkUnique;

export const generateWith = <T, V>(
  ctx: T,
  fn: (this: T) => IterableIterator<V>
) => [...doWith(ctx, fn)];

export function generate<T>(gen: () => IterableIterator<T>) {
  return [...gen()];
}

export function* maxGenerator<T>(gen: Generator<T>, max?: number) {
  if (max === 0) {
    return;
  }
  for (const element of gen) {
    yield element;
    if (max !== undefined) {
      max -= 1;
    }
    if (max === 0) {
      return;
    }
  }
}

export function tryParseNumLit(text: string): number | undefined {
  let num;
  if (text !== "" && !isNaN((num = +text))) {
    return num;
  } else {
    return undefined;
  }
}

export function indent2braces(x: string): string {
  const stack = [0];
  const output: string[] = [];
  const emit = (y: string) => output.push(y);
  for (const line of x.split("\n")) {
    if (line.trim() === "") {
      continue;
    }
    const indent = ensure(
      line.match(/\s*/),
      "Expected regex pattern to match string " + line
    )[0].length;
    while (indent < ensure(last(stack), "stack is empty")) {
      stack.pop();
      emit("}");
    }
    if (indent > ensure(last(stack), "stack is empty")) {
      emit("{");
      stack.push(indent);
    }
    emit(line.trim());
  }
  while (stack.pop() !== 0) {
    emit("}");
  }
  return output.join("\n");
}

export const deg2rad = (deg: number) => (deg / 180) * Math.PI;

export const rad2deg = (rad: number) => rad * (180 / Math.PI);

export function randUint16() {
  const supportsCryptoRandomValues =
    typeof window !== "undefined" && !!window.crypto?.getRandomValues;
  if (supportsCryptoRandomValues) {
    return window.crypto.getRandomValues(new Uint16Array(1))[0];
  } else {
    const max = 2 ** 16;
    return Math.floor(Math.random() * max);
  }
}

export function spreadLog(obj: { [k: string]: any }) {
  const xs = generate(function* () {
    for (const k in obj) {
      const v = obj[k];
      yield k;
      yield v;
    }
  });
  return console.log(...xs);
}

export function range(left: number, right: number, inclusive: boolean) {
  const r: number[] = [];
  const ascending = left < right;
  const end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    r.push(i);
  }
  return r;
}

export function simpleWords(text: string) {
  return words(text, /\S+/g);
}

export const tuple = <T extends any[]>(...args: T): T => args;

export async function asyncFilter<T>(
  arr: T[],
  predicate: (item: T) => Promise<boolean>
): Promise<T[]> {
  return Promise.all(arr.map(predicate)).then((results) =>
    arr.filter((_v, index) => results[index])
  );
}

export function filterMapTruthy<T, U>(
  xs: T[],
  f: (x: T, i: number) => U | Falsy
): U[] {
  return xs.map(f).filter((x) => x) as U[];
}

export function filterMapNils<T, U>(
  xs: T[],
  f: (x: T) => U | null | undefined
): U[] {
  return xs.map(f).filter((x) => x !== null && x !== undefined) as U[];
}

export function nullToUndefined<T>(x: T | undefined | null): T | undefined {
  return isNil(x) ? undefined : x;
}

export function undefinedToNull<T>(x: T | undefined | null): T | null {
  return isNil(x) ? null : x;
}

export function xIntersect<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set([...a].filter((x) => b.has(x)));
}

export function xUnion<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set([...b, ...a]);
}

export function xSubtract<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set([...a].filter((x) => !b.has(x)));
}

export function xAddAll<T>(a: Set<T>, b: Iterable<T>) {
  for (const x of b) {
    a.add(x);
  }
}

export function pairwise<T>(xs: T[]): [T, T][] {
  return strictZip(xs.slice(0, -1), xs.slice(1));
}

export function zipWithIndex<T>(xs: ReadonlyArray<T>): [T, number][] {
  return strictZip(xs, lodashRange(xs.length));
}

export function describeValueOrType(x: any): string {
  return isJsonScalar(x)
    ? isString(x)
      ? JSON.stringify(truncateTextMid(100, x))
      : JSON.stringify(x)
    : x === undefined
    ? "undefined"
    : isDate(x)
    ? `new Date("${x.toISOString()}")`
    : x.constructor.modelTypeName ?? x.constructor.name;
}

export function ensureInstanceAbstract<T>(x: any, type: Function): T {
  check(x instanceof type, () => mkUnexpectedTypeMsg([type], x));
  return x as T;
}

export function eagerCoalesce<T>(...attempts: (T | null | undefined)[]): T {
  for (const attempt of attempts) {
    if (attempt !== null && attempt !== undefined) {
      return attempt;
    }
  }
  throw new Error(
    "none of the values to coalesce() are non-null/non-undefined"
  );
}

export function coalesce<T extends {}, U>(
  x: T | null | undefined,
  fallback: () => U
): T | U {
  return x !== null && x !== undefined ? x : fallback();
}

export function filterFalse<T>(xs: ReadonlyArray<T | false>): T[] {
  return xs.filter((x): x is T => x !== false);
}

export function filterFalsy<T>(xs: ReadonlyArray<T | Falsy>): T[] {
  return xs.filter(isTruthy);
}

export function spawnWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T
): (...funcArgs: Parameters<T>) => void {
  return (...args) => {
    spawn(fn(...args));
  };
}

export function spawn(_promise: PromiseLike<any>) {}

export function spawnPromise(_promise: Promise<any>) {}

export function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function ensureString(x: any) {
  if (isString(x)) {
    return x;
  } else {
    throw new Error(`Expected string, but got ${typeof x}`);
  }
}

export function deriveWindow(elm: Element) {
  return ensure(
    ensure(elm.ownerDocument, "no ownerDocument in " + elm.constructor.name)
      .defaultView,
    "no defaultView in ownerDocument of " + elm.constructor.name
  );
}

/**
 * Just a cast to any, but flags this usage as a workaround to some platform
 * or library limitation. Avoids polluting codebase with raw `as` calls and
 * explicitly notes the purpose.
 */
export function workaroundAny(x: any): any {
  return x;
}

/**
 * Like `instanceof HTMLElement` but works cross-frame.
 */
export function isHTMLElt(x: any): x is HTMLElement {
  return (
    isElement(x) && x instanceof workaroundAny(deriveWindow(x)).HTMLElement
  );
}

/**
 * Like `ensureInstance(..., HTMLElement)`, but works cross-frame.
 */
export function ensureHTMLElt(x: any): HTMLElement {
  // This `as` is due to https://github.com/Microsoft/TypeScript/issues/21568.
  check(isHTMLElt(x));
  return x;
}

/**
 * Like `ensureInstance(..., Element)`, but works cross-frame.
 */
export function ensureElt(x: any): HTMLElement {
  check(isElement(x));
  return x;
}

export function ensureInstance<T>(
  x: any,
  type: Constructor<T> | TypeStamped<T>
): T;
export function ensureInstance<T, U>(
  x: any,
  type1: Constructor<T> | TypeStamped<T>,
  type2: Constructor<U> | TypeStamped<U>
): T | U;
export function ensureInstance<T, U, V>(
  x: any,
  type1: Constructor<T> | TypeStamped<T>,
  type2: Constructor<U> | TypeStamped<U>,
  type3: Constructor<V> | TypeStamped<V>
): T | U | V;
export function ensureInstance<T, U, V, W>(
  x: any,
  type1: Constructor<T> | TypeStamped<T>,
  type2: Constructor<U> | TypeStamped<U>,
  type3: Constructor<V> | TypeStamped<V>,
  type4: Constructor<W> | TypeStamped<W>
): T | U | V | W;
export function ensureInstance(
  x: any,
  ...types: [Constructor<any> | TypeStamped<any>]
): any {
  check(
    types.some((type) => x instanceof (type as any)),
    () => mkUnexpectedTypeMsg(hackyCast(types), x)
  );
  return x;
}

function getTypeName(type: Function | TypeStamped<any>) {
  const casted = hackyCast(type);
  return casted.modelTypeName || casted.name;
}

export function mkUnexpectedTypeMsg(
  types: (Function | TypeStamped<any>)[],
  x: any
) {
  const expected = types.map((t) => getTypeName(t)).join(" | ");
  const actual = describeValueOrType(x);
  return `Expected type ${expected}, but got ${actual}`;
}

export function ensureArrayOfInstances<T>(
  xs: any,
  type: Constructor<T> | TypeStamped<T>
): T[] {
  check(Array.isArray(xs) && xs.every((x) => ensureInstance(x, type) && true));
  return xs;
}

export function ensureInstanceMaybe<T>(x: any, type: { new (...args): T }): T;
export function ensureInstanceMaybe<T, U>(
  x: any,
  type1: { new (...args): T },
  type2: { new (...args): U }
): T | U;
export function ensureInstanceMaybe(
  x: any,
  ...types: [{ new (...args): any }]
): any {
  check(x == null || types.some((type) => x instanceof type));
  return x;
}

export function precisionRound(num: number, prec: number): number {
  const factor = Math.pow(10, prec);
  return Math.round(num * factor) / factor;
}

export function betweenInclusive(x: number, a: number, b: number) {
  return a <= x && x <= b;
}

export function betweenExclusive(x: number, a: number, b: number) {
  return a < x && x < b;
}

export function betweenRange(x: number, a: number, b: number) {
  return a <= x && x < b;
}

export function restrictBetweenInclusive(x: number, min: number, max: number) {
  if (x < min) {
    return min;
  } else if (x > max) {
    return max;
  } else {
    return x;
  }
}

export function* cumsum(xs: number[]) {
  let sum = 0;
  for (const x of xs) {
    sum += x;
    yield sum;
  }
}

export function ensureType<T>(x: T): T {
  return x;
}

export function strictIdentity<T>(x: T): T {
  return x;
}

interface Maybe<T> {
  <U>(f: (x: T) => U | null | undefined): Maybe<U>;
  (): T | undefined;
}

/**
 * Like maybe() but chain together multiple functions, any of which can return
 * null | undefined.
 *
 * E.g.:
 *
 *    const color = maybes(cell)(c => c.srcLayerId)(i => rubik.getLayer(i))(l
 * => l.props.color)();
 */
export function maybes<T>(x: T | null | undefined): Maybe<T> {
  return function <U>(f?: any): any {
    return !f
      ? x
      : x !== null && x !== undefined
      ? maybes<U>(f(x))
      : maybes<U>(undefined);
  };
}

export function isReactKey(x: unknown): x is Key {
  return isString(x) || isNumber(x);
}

export function strict(
  literals: TemplateStringsArray,
  ...placeholders: string[]
) {
  return interleave(literals, placeholders).join("");
}

export function assertNever(_x: never): never {
  throw new Error("unexpected branch taken");
}

export function rotateStartingFrom<T>(
  xs: ReadonlyArray<T>,
  x: T
): ReadonlyArray<T> {
  const pos = xs.indexOf(x);
  check(pos >= 0);
  return [...xs.slice(pos), ...xs.slice(0, pos)];
}

/**
 * Shallow comparison of arrays.
 */
export function arrayEq(xs: ReadonlyArray<any>, ys: ReadonlyArray<any>) {
  return xs.length === ys.length && xs.every((x, i) => x === ys[i]);
}

export function isPrefixArray(xs: ReadonlyArray<any>, ys: ReadonlyArray<any>) {
  return xs.length <= ys.length && arrayEq(ys.slice(0, xs.length), xs);
}
/**
 * Shallow comparison of arrays.
 */
export function arrayEqIgnoreOrder(
  xs: ReadonlyArray<any>,
  ys: ReadonlyArray<any>
) {
  if (xs.length !== ys.length) {
    return false;
  }
  if (xs.length === 0) {
    return true;
  }
  const usedIndex = new Set<number>();
  return xs.every((x) => {
    const iy = ys.findIndex((y, i) => y === x && !usedIndex.has(i));
    if (iy === -1) {
      return false;
    }
    usedIndex.add(iy);
    return true;
  });
}

/**
 * Shallow comparison of objects.
 */
export function objsEq(x: Readonly<any>, y: Readonly<any>) {
  const xKeys = Object.keys(x);
  const yKeys = Object.keys(y);
  if (xKeys.length !== yKeys.length) {
    return false;
  }
  for (const key of xKeys) {
    if (x[key] !== y[key]) {
      return false;
    }
  }
  return true;
}

export function shallowEq(x: unknown, y: unknown) {
  if (x == null || y == null) {
    return x == y;
  } else if (Array.isArray(x) && Array.isArray(y)) {
    return arrayEq(x, y);
  } else if (typeof x === "object" && typeof y === "object") {
    return objsEq(x, y);
  } else {
    return x === y;
  }
}

export function mapsEq(x: Map<any, any>, y: Map<any, any>) {
  if (x.size !== y.size) {
    return false;
  }

  for (const key of x.keys()) {
    if (!y.has(key) || x.get(key) !== y.get(key)) {
      return false;
    }
  }

  return true;
}

export function setsEq(x: Set<any>, y: Set<any>) {
  if (x.size !== y.size) {
    return false;
  }

  for (const item of x) {
    if (!y.has(item)) {
      return false;
    }
  }
  return true;
}

export interface MapLike<K, V> {
  get(k: K): V | undefined;
  set(k: K, v: V): void;
}

export function xSetDefault<K, V>(xs: MapLike<K, V>, k: K, gen: () => V): V {
  let v = xs.get(k);
  if (v === undefined) {
    v = gen();
    xs.set(k, v);
    return v;
  } else {
    return v;
  }
}

export function withDefault<K extends string | number | symbol, V>(
  xs: Record<K, V>,
  key: K,
  defaultVal: V
) {
  if (!(key in xs)) {
    xs[key] = defaultVal;
  }
  return xs[key];
}

export function withDefaultFunc<K extends string | number | symbol, V>(
  xs: Record<K, V>,
  key: K,
  defaultValFunc: () => V
) {
  if (!(key in xs)) {
    xs[key] = defaultValFunc();
  }
  return xs[key];
}

export const MAKE_EMPTY_OBJECT = () => ({});
export const MAKE_EMPTY_ARRAY = () => [];

export function invertRecord<
  K extends string | number | symbol,
  V extends string | number | symbol
>(xs: Record<K, V>): Record<V, K> {
  return Object.fromEntries(Object.entries(xs).map(([k, v]) => [v, k]));
}

export function filterMapKeys<K, V>(map: Map<K, V>, pred: (k: K) => boolean) {
  return new Map([...map.entries()].filter(([k, _v]) => pred(k)));
}

export function sliding<T>(
  xs: ReadonlyArray<T>,
  chunkSize: number,
  step: number,
  onlyFullChunks = false
): T[][] {
  function* gen() {
    for (const i of lodashRange(0, xs.length, step)) {
      const chunk = xs.slice(i, i + chunkSize);
      if (!onlyFullChunks || chunk.length === chunkSize) {
        yield chunk;
      }
    }
  }
  return [...gen()];
}

/**
 * Just a way to explicitly denote that a cast is safe.  No tooling built
 * around this yet.  Use like: `safeCast(x as string[])`.
 */
export function safeCast<T>(x: T): T {
  return x;
}

/**
 * Just a way to explicitly denote that a cast is sloppy/hacky/tech debt.
 */
export function hackyCast<T = any>(x: any): T {
  return x;
}

/**
 * Denotes that a cast should ideally be checked at runtime. Usually this is at
 * some system boundary, e.g. a message received over the network.
 */
export function uncheckedCast<T>(x: any): T {
  return x;
}

export function chunkPairs<T>(xs: ReadonlyArray<T>): [T, T][] {
  check(xs.length % 2 === 0);
  return safeCast(lodashChunk(xs, 2) as [T, T][]);
}

export function ensureKey(x: any): Key {
  if (isString(x) || isNumber(x)) {
    return x;
  } else {
    throw new Error("not a valid React key (string/number)");
  }
}

export function last<Arr extends ReadonlyArray<any>>(xs: Arr): Last<Arr> {
  check(xs.length > 0, "Expected non-empty array");
  return xs[xs.length - 1] as Last<Arr>;
}

export function butLast<Arr extends ReadonlyArray<any>>(xs: Arr): ButLast<Arr> {
  return safeCast(xs.slice(0, -1) as ButLast<Arr>);
}

export function spanLast<Arr extends ReadonlyArray<any>>(
  xs: Arr
): [ButLast<Arr>, Last<Arr>] {
  check(xs.length > 0, "Expected non-empty array");
  return [butLast(xs), last(xs)];
}

export function first<T>(xs: ReadonlyArray<T>): T {
  return ensure(
    xs[0],
    "Unexpected nullish value in array of length " + xs.length
  );
}

export function maybeFirst<T>(xs: ReadonlyArray<T>): T | undefined {
  return xs[0];
}

export function clampedAt<T>(xs: ReadonlyArray<T>, i: number): T {
  return xs[clampedIndex(xs, i)];
}

export function clampedIndex<T>(xs: ReadonlyArray<T>, i: number): number {
  return clamp(i, 0, xs.length - 1);
}

export function ifEmpty<T, U>(
  xs: ReadonlyArray<T>,
  otherwise: () => U
): ReadonlyArray<T> | U {
  return xs.length > 0 ? xs : otherwise();
}

export function absmax(x: number, y: number) {
  return Math.abs(x) > Math.abs(y) ? x : y;
}

export function isInstanceOfAny<T>(x: any, type1: { new (...args): T }): x is T;
export function isInstanceOfAny<T, U>(
  x: any,
  type1: { new (...args): T },
  type2: { new (...args): U }
): x is T | U;
export function isInstanceOfAny<T, U, V>(
  x: any,
  type1: { new (...args): T },
  type2: { new (...args): U },
  type3: { new (...args): V }
): x is T | U | V;
export function isInstanceOfAny(
  x: any,
  ...types: [{ new (...args): any } | TypeStamped<any>]
): any {
  return (
    x !== null &&
    x !== undefined &&
    types.some((type) => x instanceof (type as any))
  );
}

// Opposite of Partial<T>
export type Full<T> = {
  [P in keyof T]-?: T[P];
};

export type StandardCallback<T> = (err: Error | undefined, res?: T) => void;

export function asyncToCallback<T>(
  cb: StandardCallback<T>,
  fn: () => Promise<T>
) {
  return promiseToCallback(cb, fn());
}

export function promiseToCallback<T>(cb: StandardCallback<T>, p: Promise<T>) {
  p.then((res) => cb(undefined, res)).catch((err) => cb(err));
}

export function extractDomainFromEmail(email: string) {
  return ensure(
    last(email.split("@")),
    "Failed to extract domain for email: " + email
  );
}

export async function asyncNever() {
  return new Promise<never>(() => {});
}

export function isValidEmail(str: string) {
  return !!str.match(/^\S+@\S+\.\S+$/);
}

/**
 * Simple async monadic do-notation implementation for maybe types (undefined |
 * T).
 */
export function doMaybeAsync<T>(
  f: (wrapper: <U>(x: Promise<U | undefined>) => Promise<U>) => Promise<T>
): Promise<T | undefined> {
  return new Promise((finalResolve) => {
    spawn(
      f(async (promise) => {
        const res = await promise;
        if (res !== undefined && res !== null) {
          return res;
        } else {
          finalResolve(undefined);
          return asyncNever();
        }
      }).then(finalResolve)
    );
  });
}

export function asyncWrapper<T extends any[], R>(
  f: (...args: T) => R
): (...args: T) => Promise<R> {
  return async (...args) => f(...args);
}

export function notNil<T>(x: T | undefined | null): x is T {
  return !isNil(x);
}

export type AsyncCallable = (...args: any[]) => Promise<any>;

/**
 * Throttle invocations of a function to allow a single outstanding invocation
 * at a time.
 *
 * But, has a buffer of size one, so that after the current invocation
 * completes, it calls the last attempted invocation.
 *
 * Other invocations that get evicted from the buffer get returned bounceValue
 * upon eviction.
 */
export function asyncOneAtATime(
  f: AsyncCallable,
  bounceValue: any
): AsyncCallable {
  interface CallInfo {
    args: any[];
    resolve: (arg?: any) => any;
    reject: (arg?: any) => any;
  }
  let waitingCall: CallInfo | undefined = undefined,
    currentPromise: Promise<any> | undefined = undefined;
  function invoke({ args, resolve, reject }: CallInfo) {
    const onCompletion = () => {
      currentPromise = undefined;
      if (waitingCall) {
        invoke(waitingCall);
        waitingCall = undefined;
      }
    };
    currentPromise = f(...args);
    currentPromise.then(onCompletion, onCompletion);
    currentPromise.then(resolve, reject);
  }
  return (...args: any[]) => {
    return new Promise((resolve, reject) => {
      if (!currentPromise) {
        // Free to proceed.
        invoke({ args, resolve, reject });
      } else {
        // Evict current waiter, and enqueue self.
        if (waitingCall) {
          waitingCall.resolve(bounceValue);
        }
        waitingCall = { args, resolve, reject };
      }
    });
  };
}

/**
 * Returns a function that executes `f` at most `max` at a time
 */
export function asyncMaxAtATime(max: number, f: AsyncCallable): AsyncCallable {
  // Thanks ChatGPT for writing this for me
  const queue: (() => Promise<void>)[] = [];
  let active = 0;
  const executeCall = async (...args: any[]) => {
    if (active >= max) {
      return new Promise((resolve, reject) => {
        queue.push(async () => {
          executeCall(...args).then(resolve, reject);
        });
      });
    }
    active++;
    try {
      return await f(...args);
    } finally {
      active--;
      if (queue.length > 0) {
        const next = queue.shift()!;
        spawn(next());
      }
    }
  };
  return executeCall;
}

export function isArrayOfStrings(v: any): v is string[] {
  return isArray(v) && v.every(isString);
}

/**
 * Simple hash function from
 */
export function simpleHash(text: string) {
  let hash = 0,
    i,
    chr;
  if (text.length === 0) {
    return hash;
  }
  for (i = 0; i < text.length; i++) {
    chr = text.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export function hasKey<K extends string>(v: any, key: K): v is Record<K, any> {
  return typeof v === "object" && v !== null && key in v;
}

export function isJsonScalar(v: any): v is string | number | boolean | null {
  return isString(v) || isNumber(v) || isBoolean(v) || v === null;
}

export function ordinal(v: number) {
  if (v % 10 == 1 && v % 100 != 11) {
    return v + "st";
  } else if (v % 10 == 2 && v % 100 != 12) {
    return v + "nd";
  } else if (v % 10 == 3 && v % 100 != 13) {
    return v + "rd";
  }
  return v + "th";
}

/**
 * Given an arbitrary object, return a JSON summary of it, which contains just
 * the shallow top-level entries (all own properties, enumerable or not).
 */
export function shallowJson(x: {}) {
  return Object.fromEntries(
    Object.getOwnPropertyNames(x)
      .map((k) => tuple(k, x[k]))
      .filter(([_k, v]) => isJsonScalar(v))
  );
}

export function yearFromNow() {
  return new Date(new Date().setFullYear(new Date().getFullYear() + 1));
}

export function truncateText(limit: number, text: string) {
  return text.length <= limit ? text : text.slice(0, limit - 3) + "...";
}

export function truncateTextMid(limit: number, text: string) {
  return text.length <= limit
    ? text
    : text.slice(0, limit / 2) + "..." + text.slice(-(limit / 2 - 3));
}

export function stampObjectUuid(x: Error | string) {
  const obj = x as any;
  if (!obj.__uuid) {
    try {
      obj.__uuid = mkUuid();
    } catch (err) {
      // Cannot always set properties on objects. For instance we see:
      // Cannot create property '__uuid' on string '...'.
    }
  }
  return obj.__uuid;
}

export function capCamelCase(text: string) {
  return upperFirst(camelCase(text));
}

/**
 * Works like L.merge(), except the following are replace rather than merge:
 *
 * - If it's an array
 * - If either is object but has a __replaceAtomically property
 * - If src is empty
 *
 * (For L.merge(), these only get merged into larger ones, so for instance merging {x:[1]} into {x:[2,3]} yields {x:[1,3]}).
 *
 * The only possible non-sane part of this is the empty object behavior :)
 */
export function mergeSane<TObject, TSource>(
  object: TObject,
  source: TSource
): TObject & TSource;
export function mergeSane<TObject, TSource1, TSource2>(
  object: TObject,
  source1: TSource1,
  source2: TSource2
): TObject & TSource1 & TSource2;
export function mergeSane<TObject, TSource1, TSource2, TSource3>(
  object: TObject,
  source1: TSource1,
  source2: TSource2,
  source3: TSource3
): TObject & TSource1 & TSource2 & TSource3;
export function mergeSane<TObject, TSource1, TSource2, TSource3, TSource4>(
  object: TObject,
  source1: TSource1,
  source2: TSource2,
  source3: TSource3,
  source4: TSource4
): TObject & TSource1 & TSource2 & TSource3 & TSource4;
export function mergeSane(x: any, ...y: any[]): any[] {
  return mergeWith(x, ...y, (objVal, srcVal) => {
    if (Array.isArray(objVal) && Array.isArray(srcVal)) {
      return srcVal;
    }
    if (
      isObject(objVal) &&
      isObject(srcVal) &&
      (isEmpty(srcVal) ||
        objVal["__replaceAtomically"] ||
        srcVal["__replaceAtomically"])
    ) {
      return srcVal;
    }
    return undefined;
  });
}

/**
 * Performs a "structural merge" of elements in the argument list. These
 * elements can be plain objects or arrays, and are assume to have the
 * same shape. Two objects are merged as you'd expect, and two arrays
 * are concatenated. If things of different type are in the same location
 * (anys[0] is a number, anys[1] is an object), then the first non-nil
 * value is used.
 *
 * This function was written to minimize object allocation. So it tries
 * to return existing objects or arrays where possible, and it avoids using
 * functions like filter() or map() that create new arrays where possible.
 */
export function structuralMerge<T>(xs: T[]) {
  function mergeArrays(arrays: (any[] | undefined)[]) {
    const nonEmptyCount = countPred(arrays, (x) => x != null && x.length > 0);
    if (nonEmptyCount === 0) {
      return arrays.find((x) => x != null) ?? [];
    } else if (nonEmptyCount === 1) {
      return arrays.find((x) => x != null && x.length > 0);
    } else {
      const res: any[] = [];
      for (const x of arrays) {
        if (x != null) {
          for (const x2 of x) {
            res.push(x2);
          }
        }
      }
      return res;
    }
  }
  function mergeObjects(objs: (object | undefined)[]) {
    const nonEmptyCount = countPred(objs, (x) => x != null && !isEmpty(x));
    if (nonEmptyCount === 0) {
      // Reuse the first non-nil empty object
      return objs.find((obj) => obj != null) ?? {};
    } else if (nonEmptyCount === 1) {
      // Return the only non-empty object
      return objs.find((obj) => obj != null && !isEmpty(obj));
    } else {
      const res = {};
      for (const obj of objs) {
        if (obj != null) {
          for (const key in obj) {
            if (key in res) {
              // We've already merged this key
              continue;
            }
            res[key] = mergeAny(
              objs.map((o) => (o == null ? undefined : o[key]))
            );
          }
        }
      }
      return res;
    }
  }
  function mergeAny(anys: any[]) {
    const nonNilCount = countPred(anys, (x) => x != null);
    if (nonNilCount === 0) {
      return undefined;
    } else if (nonNilCount === 1) {
      return anys.find((any) => any != null);
    } else if (anys.every((any) => any == null || Array.isArray(any))) {
      return mergeArrays(anys);
    } else if (anys.every((any) => any == null || isLiteralObject(any))) {
      return mergeObjects(anys);
    } else {
      // Just return the first non-empty thing
      return anys.find((any) => any != null);
    }
  }
  return ensure(mergeAny(xs), "Nothing to merge") as T;
}

const _structuralMergeArg: any[] = [undefined, undefined];
/**
 * Structurally merge two objects. Re-uses an argument array to avoid
 * the `...argument`, which always creates a new array.
 */
export function structuralMerge2<T>(x: T, y: T) {
  _structuralMergeArg[0] = x;
  _structuralMergeArg[1] = y;
  return structuralMerge(_structuralMergeArg) as T;
}

export function countPred<T>(array: T[], pred: (x: T) => boolean) {
  let count = 0;
  for (const x of array) {
    if (pred(x)) {
      count += 1;
    }
  }
  return count;
}

export function assignAllowEmpty(x: any, ...y: any[]) {
  assignWith(x, ...y, (objVal, srcVal) => {
    if (Array.isArray(objVal) && Array.isArray(srcVal) && srcVal.length === 0) {
      return srcVal;
    }
    if (isObject(objVal) && isObject(srcVal) && isEmpty(srcVal)) {
      return srcVal;
    }
    return undefined;
  });
  return x;
}

export function findIndexes<T>(array: T[], pred: (x: T) => boolean) {
  return array
    .map((x, i) => tuple(x, i))
    .filter(([x, _i]) => pred(x))
    .map(([_x, i]) => i);
}

export function removeAtIndexes<T>(array: T[], indexes: number[]) {
  // We can remove by index one by one from the back
  indexes = sorted(indexes).reverse();
  for (const index of indexes) {
    removeAt(array, index);
  }
  return array;
}

export function moveIndex<T>(array: T[], fromIndex: number, toIndex: number) {
  const item = removeAt(array, fromIndex);
  insert(array, toIndex, item);
}

/**
 * Returns a copy of the `array`, sorted in the same order as elements
 * in the `targetArray`, with `key` mapping elements of `array`
 * to `targetArray`
 */
export function sortAs<T, U>(array: T[], targetArray: U[], key: (t: T) => U) {
  const indices = new Map(targetArray.map((u, i) => tuple(u, i)));
  return sortBy(array, (t) => indices.get(key(t)));
}

export function sorted<T>(array: T[]) {
  return sortBy(array, strictIdentity);
}

export function sortBy<T, K>(array: T[], keyFn: (t: T) => K) {
  const sorter = (a: T, b: T) => {
    const aKey = keyFn(a);
    const bKey = keyFn(b);
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  };
  return array.slice().sort(sorter);
}

export function sortByKeys<T, K extends any[]>(array: T[], keyFn: (t: T) => K) {
  const sorter = (a: T, b: T) => {
    const aKeys = keyFn(a);
    const bKeys = keyFn(b);
    if (aKeys.length !== bKeys.length) {
      throw new Error(`Expected sort key arrays to be same length`);
    }

    for (let i = 0; i < aKeys.length; i++) {
      const aKey = aKeys[i];
      const bKey = bKeys[i];
      if (aKey < bKey) {
        return -1;
      } else if (aKey > bKey) {
        return 1;
      }
    }
    return 0;
  };
  return array.slice().sort(sorter);
}

export function sortedInsert<T>(array: T[], x: T) {
  const index = array.findIndex((y) => y > x);
  if (index < 0) {
    array.push(x);
    return array;
  } else {
    return insert(array, index, x);
  }
}

/**
 * Returns the x mod n but always positive (unlike x % n which is negative for
 * x < 0).
 */
export function mod(x: number, n: number) {
  return ((x % n) + n) % n;
}

export function mergeMaps<K, V>(...maps: Map<K, V>[]) {
  const map = new Map<K, V>();
  insertMaps(map, ...maps);
  return map;
}

export function insertMaps<K, V>(target: Map<K, V>, ...maps: Map<K, V>[]) {
  for (const m of maps) {
    for (const [key, val] of m.entries()) {
      target.set(key, val);
    }
  }
}

export function customInsertMaps<K, V>(
  f: (a: V, b: V) => V,
  target: Map<K, V>,
  ...maps: Map<K, V>[]
) {
  for (const m of maps) {
    for (const [key, val] of m.entries()) {
      if (target.has(key)) {
        target.set(key, f(ensure(target.get(key), "checked before"), val));
      } else {
        target.set(key, val);
      }
    }
  }
  return target;
}

export function mergeSets<K>(...sets: Set<K>[]) {
  const set = new Set<K>();
  for (const s of sets) {
    s.forEach((e) => set.add(e));
  }
  return set;
}

export function intersectSets<K>(set1: Set<K>, set2: Set<K>) {
  const set = new Set<K>();
  for (const k of set1.keys()) {
    if (set2.has(k)) {
      set.add(k);
    }
  }
  return set;
}

export function asArray<T>(val: T | T[] | Set<T> | undefined | null): T[] {
  if (val == null) {
    return [];
  } else if (Array.isArray(val)) {
    return val;
  } else if (val instanceof Set) {
    return Array.from(val);
  } else {
    return [val];
  }
}

/**
 * Determines if the specified string consists entirely of numeric characters.
 *
 * Copied from
 * https://github.com/gregberge/svgr/blob/master/packages/hast-util-to-babel-ast/src/util.js
 */
export function isNumeric(value: any) {
  return !Number.isNaN(value - parseFloat(value));
}

export function xIndexMap<T>(values: T[]) {
  const map = new Map<T, number>();
  for (let i = 0; i < values.length; i++) {
    map.set(values[i], i);
  }
  return map;
}

export function arrayOf<T>(count: number, factory: () => T) {
  const result: T[] = new Array(count);
  for (let i = 0; i < count; i++) {
    result[i] = factory();
  }
  return result;
}

export function partitions<T>(
  values: T[],
  predicates: ((val: T) => boolean)[]
) {
  const results = arrayOf(predicates.length + 1, () => [] as T[]);
  for (const value of values) {
    const index = predicates.findIndex((p) => p(value));
    if (index >= 0) {
      results[index].push(value);
    } else {
      results[predicates.length].push(value);
    }
  }
  return results;
}

export function partitionMap<K, V>(
  map: Map<K, V>,
  predicates: ((key: K, val: V) => boolean)[]
) {
  const partitioned = partitions(
    [...map.entries()],
    predicates.map(
      (p) =>
        ([k, v]) =>
          p(k, v)
    )
  );
  return partitioned.map((chunk) => new Map(chunk));
}

/**
 * A no-op function that simply documents that we are observing this value (and
 * thus swallows lint warnings about unused expressions).
 */
export function noopWatch(_x: unknown) {}

export function pathGet(x: any, path: string[]) {
  return path.length === 0 ? x : lodashGet(x, path);
}

export function findAllIndexesInString(haystack: string, query: string) {
  let indexes: number[] = [],
    i = -1;
  while ((i = haystack.indexOf(query, i + 1)) != -1) {
    indexes.push(i);
  }
  return indexes;
}

export function asyncTimeout(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitUntil(
  cond: () => boolean | Promise<boolean>,
  opts: { maxTimeout?: number; timeout?: number } = {}
) {
  const start = new Date().getTime();
  const maxTimeout = opts.maxTimeout ?? 300000;
  const timeout = opts.timeout ?? 1000;
  return new Promise<void>(
    spawnWrapper(async (resolve, reject) => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const now = new Date().getTime();
        const ready = await cond();
        if (ready) {
          resolve();
          return;
        } else if (now >= start + maxTimeout) {
          reject(new Error("Oops, something timed-out"));
          return;
        }
        await asyncTimeout(timeout);
      }
    })
  );
}

export class PromiseTimeoutError extends CustomError {
  readonly name = "PromiseTimeoutError";
  constructor(message?: string) {
    super(message);
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  msg: string,
  ms: number = 60 * 1000 // 1 minute
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId!)),
    new Promise<never>(
      (_resolve, reject) =>
        (timeoutId = setTimeout(() => reject(new PromiseTimeoutError(msg)), ms))
    ),
  ]);
}

/**
 * Checks if the argument obj is a plain literal object ({}), and not
 * other object-like things (arrays, class instances, etc).
 *
 * Note this relies on window.Object; if you're checking across windows,
 * like objects created within an iframe, use lodash.isPlainObject.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function isLiteralObject(obj: any, localObj = Object): obj is Object {
  return (
    !!obj && typeof obj === "object" && obj.constructor === (localObj ?? Object)
  );
}

/**
 * Like isLiteralObject, but checks if constructor is named "Object". If
 * your object may be from different windows, this is faster than
 * lodash.isPlainObject (but of course less accurate)
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function isLiteralObjectByName(obj: any): obj is Object {
  return !!obj && typeof obj === "object" && obj.constructor?.name === "Object";
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function isObjectEmpty(obj: Object) {
  return Object.keys(obj).length === 0;
}

export const assignReadonly = Object.assign;

export function mapEquals<T extends Map<any, any>>(map1: T, map2: T) {
  if (map1.size !== map2.size) {
    return false;
  }
  for (const key of map1.keys()) {
    if (!map2.has(key) || map1.get(key) !== map2.get(key)) {
      return false;
    }
  }
  return true;
}

export function setEquals<T extends Set<any>>(set1: T, set2: T) {
  if (set1.size !== set2.size) {
    return false;
  }
  for (const val of set1) {
    if (!set2.has(val)) {
      return false;
    }
  }
  return true;
}

/**
 * Counts the number of times a substring occurs in another string.
 *
 * https://stackoverflow.com/questions/4009756/how-to-count-string-occurrence-in-string
 * @param text The text to find the substrings
 * @param sub The substring to count the number of occurrences
 * @returns The number of times `sub` occurs in `text`
 */
export function substringOccurrencesCount(text: string, sub: string) {
  return (
    text.match(
      // https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
      new RegExp(sub.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
    ) || []
  ).length;
}

// Extract only writable properties from a type
// https://stackoverflow.com/questions/52443276/how-to-exclude-getter-only-properties-from-type-in-typescript
type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? A
  : B;
type WritableKeysOf<T> = {
  [P in keyof T]: IfEquals<
    { [Q in P]: T[P] },
    { -readonly [Q in P]: T[P] },
    P,
    never
  >;
}[keyof T];
export type WritablePart<T> = Pick<T, WritableKeysOf<T>>;

/**
 * Returns true if x is null/undefined or string/number/bool
 */
export function isPrimitive(x: any) {
  const type = typeof x;
  return (
    x == null || type === "string" || type === "number" || type === "boolean"
  );
}

export function maybeMemoizeFn<T extends (...args: any[]) => any>(fn: T): T {
  if (typeof window !== "undefined") {
    return memoize(fn);
  } else {
    return fn;
  }
}

export function ensureClientMemoizedFunction<T extends (...args: any[]) => any>(
  fn: T
): T & MemoizedFunction {
  assert(typeof window !== "undefined", "not running in client");
  return fn as T & MemoizedFunction;
}
