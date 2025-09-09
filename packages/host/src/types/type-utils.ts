// This file is explicitly in .eslintignore because eslint crashes
// when it sees the empty tuple type used as the default type in
// TypeUnion

/**
 * Converts a union type to a tuple type of the same members
 */
export type TupleUnion<U extends string, R extends string[] = []> = {
  [S in U]: Exclude<U, S> extends never
    ? [...R, S]
    : TupleUnion<Exclude<U, S>, [...R, S]>;
}[U] &
  string[];

export type Nullish<T> = T | null | undefined;
