import { Registerable } from "./registerable";
import { registerButton } from "./registerButton";
import { registerSlider } from "./registerSlider";
import { registerSwitch } from "./registerSwitch";

export { Registerable } from "./registerable";
export { buttonMeta, registerButton } from "./registerButton";
export { sliderMeta, registerSlider } from "./registerSlider";
export { switchMeta, registerSwitch } from "./registerSwitch";

export function registerAll(loader?: Registerable) {
  registerButton(loader);
  registerSlider(loader);
  registerSwitch(loader);
}
