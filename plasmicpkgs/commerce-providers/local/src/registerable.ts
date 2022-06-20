import registerComponent from "@plasmicapp/host/registerComponent";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";

export type Registerable = {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
};
