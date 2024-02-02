import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import { StrapiCollection, strapiCollectionMeta } from "./StrapiCollection";
import {
  StrapiCredentialsProvider,
  strapiCredentialsProviderMeta,
} from "./StrapiCredentialsProvider";
import { StrapiField, strapiFieldMeta } from "./StrapiField";

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
    loader.registerGlobalContext(
      StrapiCredentialsProvider,
      strapiCredentialsProviderMeta
    );
  } else {
    registerGlobalContext(
      StrapiCredentialsProvider,
      strapiCredentialsProviderMeta
    );
  }

  _registerComponent(StrapiCollection, strapiCollectionMeta);
  _registerComponent(StrapiField, strapiFieldMeta);
}

export { StrapiCollection, strapiCollectionMeta } from "./StrapiCollection";
export {
  StrapiCredentialsProvider,
  strapiCredentialsProviderMeta,
} from "./StrapiCredentialsProvider";
export { StrapiField, strapiFieldMeta } from "./StrapiField";
