import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import {
  WordpressFetcher,
  WordpressFetcherMeta,
  WordpressField,
  WordpressFieldMeta,
  WordpressProvider,
  WordpressProviderMeta,
} from "./wordpress";

export function registerAll(loader?: {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
}) {
  const _registerComponent = <T extends React.ComponentType<any>>(
    Component: T,
    defaultMeta: CodeComponentMeta<React.ComponentProps<T>>
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
