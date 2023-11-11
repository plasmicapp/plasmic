import { registerButton } from "./registerButton";
import { registerComboBox } from "./registerComboBox";
import { registerInput } from "./registerInput";
import { registerLabel } from "./registerLabel";
import { registerListBox } from "./registerListBox";
import { registerPopover } from "./registerPopover";
import { registerSection } from "./registerSection";
import { registerSelect } from "./registerSelect";
import { Registerable } from "./utils";

export function registerAll(loader?: Registerable) {
  registerSelect(loader);
  registerComboBox(loader);
  registerButton(loader);
  registerLabel(loader);
  registerListBox(loader);
  registerPopover(loader);
  registerInput(loader);
  registerSection(loader);
}
