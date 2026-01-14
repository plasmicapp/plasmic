import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";
import { _queryStrapi, queryStrapi, queryStrapiMeta } from "./query-strapi";

export function registerStrapi(loader?: { registerFunction: any }) {
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

  _registerFunction(queryStrapi, queryStrapiMeta);
}

export {
  // used by @plasmicpkgs/plasmic-strapi
  _queryStrapi,
  queryStrapi,
};

// used by @plasmicpkgs/plasmic-strapi
export {
  getItemKeys as _getFieldKeys,
  getFieldValue as _getFieldValue,
  getId as _getId,
  getMediaAttributes as _getMediaAttributes,
  isStrapiItem as _isStrapiItem,
  isStrapiItemArray as _isStrapiItemArray,
  isStrapiPrimitive as _isStrapiPrimitive,
} from "./strapi-compat";
export {
  extractDisplayableFields as _extractDisplayableFields,
  extractFilterableFields as _extractFilterableFields,
  isImage as _isImage,
  queryParameters as _queryParameters,
} from "./utils";
