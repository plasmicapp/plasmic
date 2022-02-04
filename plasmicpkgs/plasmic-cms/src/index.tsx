import {
  registerComponent as hostRegisterComponent,
  registerContext as hostRegisterContext,
} from "@plasmicapp/host";
import {
  CmsDataProvider,
  cmsDataProviderMeta,
  CmsQueryLoader,
  cmsQueryLoaderMeta,
  CmsRowField,
  cmsRowFieldMeta,
  CmsRowLink,
  cmsRowLinkMeta,
  CmsRowLoader,
  cmsRowLoaderMeta,
  CmsRowRepeater,
  cmsRowRepeaterMeta,
} from "./components";

export function registerAll(loader?: {
  registerComponent: typeof hostRegisterComponent;
  registerContext: typeof hostRegisterContext;
}) {
  //const registerContext = loader?.registerContext ?? hostRegisterContext;
  //registerContext(CmsDataProvider, cmsDataProviderMeta);

  const registerComponent =
    loader?.registerComponent.bind(loader) ?? hostRegisterComponent;

  registerComponent(CmsDataProvider, cmsDataProviderMeta);
  registerComponent(CmsQueryLoader, cmsQueryLoaderMeta);
  registerComponent(CmsRowRepeater, cmsRowRepeaterMeta);
  registerComponent(CmsRowField, cmsRowFieldMeta);
  registerComponent(CmsRowLink, cmsRowLinkMeta);
  registerComponent(CmsRowLoader, cmsRowLoaderMeta);
}
