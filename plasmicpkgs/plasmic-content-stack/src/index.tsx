import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import {
  ContentStackCredentialsProvider,
  ContentStackCredentialsProviderMeta,
  ContentStackFetcher,
  ContentStackFetcherMeta,
  ContentStackField,
  ContentStackFieldMeta,
} from "./contentstack";

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
      ContentStackCredentialsProvider,
      ContentStackCredentialsProviderMeta
    );
  } else {
    registerGlobalContext(
      ContentStackCredentialsProvider,
      ContentStackCredentialsProviderMeta
    );
  }

  _registerComponent(ContentStackFetcher, ContentStackFetcherMeta);
  _registerComponent(ContentStackField, ContentStackFieldMeta);
}

export * from "./contentstack";
