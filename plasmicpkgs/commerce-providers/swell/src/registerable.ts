import { registerGlobalContext } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";

export type Registerable = {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
};
