import { registerComponent } from "@plasmicapp/host";
import { registerButton, registerSlider } from ".";

export type Registerable = {
  registerComponent: typeof registerComponent;
};

export function registerAll(loader?: Registerable) {
  registerButton(loader);
  registerSlider(loader);
}
