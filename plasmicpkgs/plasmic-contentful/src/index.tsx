import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import {
  ContentfulCredentialsProvider,
  ContentfulCredentialsProviderMeta,
  ContentfulFetcher,
  ContentfulFetcherMeta,
  ContentfulField,
  ContentfulFieldMeta,
} from "./contentful";

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
      ContentfulCredentialsProvider,
      ContentfulCredentialsProviderMeta
    );
  } else {
    registerGlobalContext(
      ContentfulCredentialsProvider,
      ContentfulCredentialsProviderMeta
    );
  }
  _registerComponent(ContentfulFetcher, ContentfulFetcherMeta);
  _registerComponent(ContentfulField, ContentfulFieldMeta);
}

export * from "./contentful";
