import type { Opaque } from "type-fest";

/**
 * Falsy (from utility-types)
 * @desc Type representing falsy values in TypeScript: `false | "" | 0 | null | undefined`
 * @example
 *   type Various = 'a' | 'b' | undefined | false;
 *
 *   // Expect: "a" | "b"
 *   Exclude<Various, Falsy>;
 */
export type Falsy = false | "" | 0 | null | undefined;

/**
 * See https://gerrit.aws.plasmic.app/c/plasmic/+/12368
 * Use type-fest.ReadonlyDeep instead.
 * @deprecated
 */
export type DeepReadonly<T> = T;

/**
 * See https://gerrit.aws.plasmic.app/c/plasmic/+/12368
 * Use type-fest.ReadonlyDeep instead.
 * @deprecated
 */
export type DeepReadonlyArray<T> = T[];

/**
 * A Constructor mapped type that works with abstract classes
 * See https://stackoverflow.com/questions/36886082/abstract-constructor-type-in-typescript
 */
export type Constructor<T> = abstract new (...args: any[]) => T;

export type ReplaceKey<T extends object, K extends keyof T, V> = Omit<T, K> & {
  [k in K]: V;
};

export function toOpaque<T, U>(x: T): Opaque<T, U> {
  return x as Opaque<T, U>;
}

/**
 * https://stackoverflow.com/questions/63789897/typescript-remove-last-element-from-parameters-tuple-currying-away-last-argum
 */
export type ButLast<T extends readonly any[]> = T extends [...infer Head, any]
  ? Head
  : T[number][];
export type Last<T extends readonly any[]> = T extends [...any[], infer Tail]
  ? Tail
  : T[number];

//
// https://stackoverflow.com/questions/58434389/typescript-deep-keyof-of-a-nested-object
//

export type Prev = [never, 0, 1, 2, 3, 4, 5, 6, ...0[]];

export type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${"" extends P ? "" : "."}${P}`
    : never
  : never;

export type JoinList<K, P> = K extends string | number
  ? P extends (string | number)[]
    ? [K, ...P]
    : never
  : never;

export type Paths<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? `${K}` | (Paths<T[K], Prev[D]> extends infer R ? Join<K, R> : never)
        : never;
    }[keyof T]
  : "";

export type PathsList<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ?
            | [K]
            | (PathsList<T[K], Prev[D]> extends infer R
                ? JoinList<K, R>
                : never)
        : never;
    }[keyof T]
  : [];

export type Leaves<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends object
  ? { [K in keyof T]-?: Join<K, Leaves<T[K], Prev[D]>> }[keyof T]
  : "";

export type DropFirst<T extends unknown[]> = T extends [any, ...infer U]
  ? U
  : never;

export type Values<T> = T[keyof T];

export type AsyncGeneratorReturnType<T> = T extends (
  ...args: any[]
) => AsyncGenerator<infer R, any, any>
  ? R
  : never;

/**
 * OmitByValue (from utility-types)
 * @desc From `T` remove a set of properties by value matching `ValueType`.
 * Credit: [Piotr Lewandowski](https://medium.com/dailyjs/typescript-create-a-condition-based-subset-types-9d902cea5b8c)
 * @example
 *   type Props = { req: number; reqUndef: number | undefined; opt?: string; };
 *
 *   // Expect: { reqUndef: number | undefined; opt?: string; }
 *   type Props = OmitByValue<Props, number>;
 *   // Expect: { opt?: string; }
 *   type Props = OmitByValue<Props, number | undefined>;
 */
export type OmitByValue<T, ValueType> = Pick<
  T,
  { [Key in keyof T]-?: T[Key] extends ValueType ? never : Key }[keyof T]
>;
