import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";
import { queryWordpress, queryWordpressMeta } from "./query-wordpress";

export function registerWordpress(loader?: { registerFunction: any }) {
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

  _registerFunction(queryWordpress, queryWordpressMeta);
}

export { queryWordpress };

// used by @plasmicpkgs/plasmic-wordpress
export { ensure as _ensure, queryOperators as _queryOperators } from "./utils";
export type { QueryOperator as _QueryOperator } from "./utils";
