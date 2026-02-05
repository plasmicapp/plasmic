import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";
import {
  _queryContentful,
  queryContentful,
  queryContentfulMeta,
} from "./query-contentful";

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

export {
  // Exports for @plasmicpkgs/plasmic-contentful
  _queryContentful,
  queryContentful,
};

// Exports for @plasmicpkgs/plasmic-contentful
export { denormalizeData as _denormalizeData } from "./query-contentful";
export type { _Entry } from "./types";
export { _ensure, _uniq } from "./utils";
