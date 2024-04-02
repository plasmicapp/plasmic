import { OmitByValue } from "@/wab/commons/types";

/** Converts an object with sync/async methods into an object with async methods only. */
export type PromisifyMethods<T extends object> = OmitByValue<
  {
    [K in keyof T]: T[K] extends (
      ...args: infer Parameters
    ) => Promise<infer ReturnType>
      ? (...args: Parameters) => Promise<ReturnType>
      : T[K] extends (...args: infer Parameters) => infer ReturnType
      ? (...args: Parameters) => Promise<ReturnType>
      : never;
  },
  never
>;

/** Converts an object with sync/async methods into an object with async methods only. */
export function promisifyMethods<T extends object>(o: T): PromisifyMethods<T> {
  return o as PromisifyMethods<T>; // this is safe because awaiting a non-Promise is a no-op
}
