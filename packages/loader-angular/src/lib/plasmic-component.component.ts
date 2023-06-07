import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from "@angular/core";
import { renderToElement } from "@plasmicapp/loader-react";
import { PlasmicLoaderService } from "./plasmic-loader.service";

@Component({
  selector: "plasmic-component",
  template: ` <div #root></div> `,
})
export class PlasmicComponent implements AfterViewInit {
  @ViewChild("root") root!: ElementRef<HTMLElement>;
  @Input() component!: string;
  @Input() projectId?: string;
  @Input() componentProps?: any;

  constructor(public loaderService: PlasmicLoaderService) {}

  updateElement(): void {
    if (this.root && this.root.nativeElement && this.loaderService.loader) {
      renderToElement(
        this.loaderService.loader,
        this.root.nativeElement,
        {
          name: this.component,
          projectId: this.projectId,
        },
        {
          componentProps: this.componentProps,
          prefetchedData: this.loaderService.prefetchedData,
          globalVariants: this.loaderService.globalVariants,
          pageParams: this.loaderService.pageParams,
          pageQuery: this.loaderService.pageQuery,
        }
      );
    }
  }

  ngAfterViewInit(): void {
    this.updateElement();
  }

  ngOnChanges(): void {
    this.updateElement();
  }
}
