import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import {
  SanityCredentialsProvider,
  sanityCredentialsProviderMeta,
  SanityFetcher,
  sanityFetcherMeta,
  SanityField,
  sanityFieldMeta,
} from "./sanity";

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
    loader.registerGlobalContext(
      SanityCredentialsProvider,
      sanityCredentialsProviderMeta
    );
  } else {
    registerGlobalContext(
      SanityCredentialsProvider,
      sanityCredentialsProviderMeta
    );
  }

  _registerComponent(SanityFetcher, sanityFetcherMeta);
  _registerComponent(SanityField, sanityFieldMeta);
}

export * from "./sanity";
