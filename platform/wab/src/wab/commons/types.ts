/**
 * Lets you convert certain keys of argument type from optional to required
 */
import { Brand, Omit } from "utility-types";

/**
 * Lets you convert certain keys of argument type from required to optional
 */
export type OptionalSubKeys<T extends {}, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

export type RequiredSubKeys<T extends {}, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: T[P];
};

export type DeepReadonly<T> = T;

export type DeepReadonlyArray<T> = T[];

/**
 * A Constructor mapped type that works with abstract classes
 * See https://stackoverflow.com/questions/36886082/abstract-constructor-type-in-typescript
 */
export type Constructor<T> = abstract new (...args: any[]) => T;

export type ReplaceKey<T extends object, K extends keyof T, V> = Omit<T, K> & {
  [k in K]: V;
};

export function brand<T, U>(x: T): Brand<T, U> {
  return x as Brand<T, U>;
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
