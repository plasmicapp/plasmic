import { NgModule } from "@angular/core";
import { PlasmicComponent } from "./plasmic-component.component";
import { PlasmicRootProvider } from "./plasmic-root-provider.component";

@NgModule({
  declarations: [PlasmicComponent, PlasmicRootProvider],
  exports: [PlasmicComponent, PlasmicRootProvider],
})
export class PlasmicModule {}
