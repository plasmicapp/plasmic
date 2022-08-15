import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import registerComponent from "@plasmicapp/host/registerComponent";

export type Registerable = {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
};
