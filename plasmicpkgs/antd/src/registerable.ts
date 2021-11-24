import { registerComponent } from "@plasmicapp/host";

export type Registerable = {
  registerComponent: typeof registerComponent;
};
