import { Component, Host, Input, OnInit } from "@angular/core";
import {
  ComponentRenderData,
  GlobalVariantSpec,
  PlasmicComponentLoader,
} from "@plasmicapp/loader-react";
import { PlasmicLoaderService } from "./plasmic-loader.service";

@Component({
  selector: "plasmic-root-provider",
  template: "<ng-content></ng-content>",
  providers: [PlasmicLoaderService],
})
export class PlasmicRootProvider implements OnInit {
  @Input() loader!: PlasmicComponentLoader;
  @Input() prefetchedData?: ComponentRenderData;
  @Input() globalVariants?: GlobalVariantSpec[];
  @Input() pageParams?: Record<string, any>;
  @Input() pageQuery?: Record<string, any>;
  constructor(@Host() private plasmicLoaderService: PlasmicLoaderService) {}

  ngOnInit(): void {
    this.plasmicLoaderService.load({
      loader: this.loader,
      prefetchedData: this.prefetchedData,
      globalVariants: this.globalVariants,
      pageParams: this.pageParams,
      pageQuery: this.pageQuery,
    });
  }
}
