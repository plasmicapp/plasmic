import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import {
  GraphCMSCredentialsProvider,
  GraphCMSCredentialsProviderMeta,
  GraphCMSFetcher,
  GraphCMSFetcherMeta,
  GraphCMSField,
  GraphCMSFieldMeta,
} from "./graphcms";

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
      GraphCMSCredentialsProvider,
      GraphCMSCredentialsProviderMeta
    );
  } else {
    registerGlobalContext(
      GraphCMSCredentialsProvider,
      GraphCMSCredentialsProviderMeta
    );
  }

  _registerComponent(GraphCMSFetcher, GraphCMSFetcherMeta);
  _registerComponent(GraphCMSField, GraphCMSFieldMeta);
}

export * from "./graphcms";
