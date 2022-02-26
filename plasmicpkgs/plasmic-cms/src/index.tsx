import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext, {
  GlobalContextMeta,
} from "@plasmicapp/host/registerGlobalContext";
import {
  CmsCredentialsProvider,
  cmsCredentialsProviderMeta,
  CmsQueryRepeater,
  cmsQueryRepeaterMeta,
  CmsRowField,
  cmsRowFieldMeta,
  CmsRowFieldValue,
  cmsRowFieldValueMeta,
  CmsRowImage,
  cmsRowImageMeta,
  CmsRowLink,
  cmsRowLinkMeta,
} from "./components";

export function registerAll(loader?: {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
}) {
  //const registerContext = loader?.registerContext ?? hostRegisterContext;
  //registerContext(CmsDataProvider, cmsDataProviderMeta);

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

  const _registerGlobalContext = <T extends React.ComponentType<any>>(
    Component: T,
    defaultMeta: GlobalContextMeta<React.ComponentProps<T>>
  ) => {
    if (loader) {
      loader.registerGlobalContext(Component, defaultMeta);
    } else {
      registerGlobalContext(Component, defaultMeta);
    }
  };

  _registerGlobalContext(CmsCredentialsProvider, cmsCredentialsProviderMeta);
  // _registerComponent(CmsQueryLoader, cmsQueryLoaderMeta);
  // _registerComponent(CmsRowRepeater, cmsRowRepeaterMeta);
  _registerComponent(CmsQueryRepeater, cmsQueryRepeaterMeta);
  _registerComponent(CmsRowField, cmsRowFieldMeta);
  _registerComponent(CmsRowLink, cmsRowLinkMeta);
  _registerComponent(CmsRowImage, cmsRowImageMeta);
  _registerComponent(CmsRowFieldValue, cmsRowFieldValueMeta);
  // _registerComponent(CmsRowLoader, cmsRowLoaderMeta);
}

export * from "./components";
