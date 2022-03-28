import registerComponent from "@plasmicapp/host/registerComponent";

export type Registerable = {
  registerComponent: typeof registerComponent;
};
