import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerFunction, {
  CustomFunctionMeta,
} from "@plasmicapp/host/registerFunction";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import { queryWordpress, queryWordpressMeta } from "./query-wordpress";
import {
  WordpressFetcher,
  WordpressFetcherMeta,
  WordpressField,
  WordpressFieldMeta,
  WordpressProvider,
  WordpressProviderMeta,
} from "./wordpress";

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

export function registerAll(loader?: {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
}) {
  const _registerComponent = <T extends React.ComponentType<any>>(
    Component: T,
    defaultMeta: ComponentMeta<React.ComponentProps<T>>
  ) => {
    if (loader) {
      loader.registerComponent(Component, defaultMeta);
    } else {
      registerComponent(Component, defaultMeta);
    }
  };

  if (loader) {
    loader.registerGlobalContext(WordpressProvider, WordpressProviderMeta);
  } else {
    registerGlobalContext(WordpressProvider, WordpressProviderMeta);
  }

  _registerComponent(WordpressFetcher, WordpressFetcherMeta);
  _registerComponent(WordpressField, WordpressFieldMeta);
}

export * from "./wordpress";
