import { Registerable } from "./registerable";
import { registerButton } from "./registerButton";

export default registerButton;

export function registerAll(loader?: Registerable) {
  registerButton(loader);
}
