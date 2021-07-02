import {
  ComponentRenderData,
  GlobalVariantSpec,
  PlasmicComponentLoader,
} from "@plasmicapp/loader-react";

export const PLASMIC_CONTEXT = Symbol("PlasmicContext");

export interface PlasmicContextValue {
  loader: PlasmicComponentLoader;
  globalVariants?: GlobalVariantSpec[];
  prefetchedData?: ComponentRenderData;
}
