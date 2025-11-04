import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";
import { queryContentful, queryContentfulMeta } from "./query-contentful";

export function registerContentful(loader?: { registerFunction: any }) {
  function _registerFunction<T extends (...args: any[]) => any>(
    fn: T,
    meta: CustomFunctionMeta<T>
  ) {
    if (loader) {
      loader.registerFunction(fn, meta);
    } else {
      registerFunction(fn, meta);
    }
  }

  _registerFunction(queryContentful, queryContentfulMeta);
}

export { queryContentful };

// Exports for @plasmicpkgs/plasmic-contentful
export type { _Entry } from "./types";
export { _ensure, _uniq } from "./utils";
