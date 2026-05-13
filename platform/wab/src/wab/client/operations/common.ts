/**
 * Generic envelope for operation results.
 *
 * The `success` branch carries operation-specific payload fields (intersected
 * via `T`) at the top level. The `error` branch is reserved for hard failures
 * where the primary result was not produced.
 *
 * Usage:
 *   type CreateFooResult = OperationResult<{ foo: Foo }>;
 *   //   { result: "success"; foo: Foo }
 *   // | { result: "error"; message: string }
 */
export type OperationResult<T> =
  | ({ result: "success" } & T)
  | { result: "error"; message: string };
