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
  public pageParams?: Record<string, any>;
  public pageQuery?: Record<string, any>;
  private loaded: boolean = false;
  constructor() {
    this.loaded = false;
  }
  load(opts: {
    loader: PlasmicComponentLoader;
    prefetchedData?: ComponentRenderData;
    globalVariants?: GlobalVariantSpec[];
    pageParams?: Record<string, any>;
    pageQuery?: Record<string, any>;
  }) {
    if (!this.loaded) {
      this.loader = opts.loader;
      this.prefetchedData = opts.prefetchedData;
      this.globalVariants = opts.globalVariants;
      this.pageParams = opts.pageParams;
      this.pageQuery = opts.pageQuery;
      this.loaded = true;
    }
  }
}
