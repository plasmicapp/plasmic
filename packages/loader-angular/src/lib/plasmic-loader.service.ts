import { Injectable } from "@angular/core";
import {
  ComponentRenderData,
  GlobalVariantSpec,
  PlasmicComponentLoader,
} from "@plasmicapp/loader-react";

@Injectable({
  providedIn: "root",
})
export class PlasmicLoaderService {
  public loader?: PlasmicComponentLoader;
  public prefetchedData?: ComponentRenderData;
  public globalVariants?: GlobalVariantSpec[];
  private loaded: boolean = false;
  constructor() {}
  load(opts: {
    loader: PlasmicComponentLoader;
    prefetchedData?: ComponentRenderData;
    globalVariants?: GlobalVariantSpec[];
  }) {
    if (!this.loaded) {
      this.loader = opts.loader;
      this.prefetchedData = opts.prefetchedData;
      this.globalVariants = opts.globalVariants;
      this.loaded = true;
    }
  }
}
