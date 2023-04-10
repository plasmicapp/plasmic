import { registerButton } from "./registerButton";
import { registerCheckbox } from "./registerCheckbox";
import {
  registerConfigProvider,
  registerTokens,
} from "./registerConfigProvider";
import { registerDropdown } from "./registerDropdown";
import {
  registerForm,
  registerFormGroup,
  registerFormItem,
  registerFormList,
} from "./registerForm";
import { registerMenu } from "./registerMenu";
import { registerModal } from "./registerModal";
import { registerRadio } from "./registerRadio";
import { registerSelect } from "./registerSelect";
import { registerTable } from "./registerTable";
import { Registerable } from "./utils";
import { registerInput, registerPasswordInput, registerTextArea, registerNumberInput } from './registerInput';

export function registerAll(loader?: Registerable) {
  registerConfigProvider(loader);
  registerTokens(loader);
  registerSelect(loader);
  registerTable(loader);
  registerCheckbox(loader);
  registerRadio(loader);
  registerModal(loader);
  registerButton(loader);
  registerMenu(loader);
  registerDropdown(loader);
  registerForm(loader);
  registerFormItem(loader);
  registerFormGroup(loader);
  registerFormList(loader);
  registerInput(loader);
  registerPasswordInput(loader);
  registerTextArea(loader);
  registerNumberInput(loader);
}
