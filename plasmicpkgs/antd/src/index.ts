import { Registerable } from "./registerable";
import { registerButton } from "./registerButton";
import { registerOptGroup, registerOption } from "./registerOption";
import { registerSelect } from "./registerSelect";
import { registerSlider } from "./registerSlider";
import { registerSwitch } from "./registerSwitch";

export { Registerable } from "./registerable";
export { buttonMeta, registerButton } from "./registerButton";
export {
  optionMeta,
  registerOption,
  optGroupMeta,
  registerOptGroup,
} from "./registerOption";
export { selectMeta, registerSelect } from "./registerSelect";
export { sliderMeta, registerSlider } from "./registerSlider";
export { switchMeta, registerSwitch } from "./registerSwitch";

export function registerAll(loader?: Registerable) {
  registerButton(loader);
  registerSlider(loader);
  registerSwitch(loader);
  registerOption(loader);
  registerOptGroup(loader);
  registerSelect(loader);
}
