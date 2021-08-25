import type { App } from "vue-demi";
import { isVue2 } from "vue-demi";
import PlasmicComponent from "./components/plasmic-component";
import PlasmicRootProvider from "./components/plasmic-root-provider";

const install = isVue2
  ? undefined
  : (app: App): void => {
      app.component(PlasmicRootProvider.name, PlasmicRootProvider);
      app.component(PlasmicComponent.name, PlasmicComponent);
    };

export default install;
