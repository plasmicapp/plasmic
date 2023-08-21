import { registerButton } from "./registerButton";
import { checkboxComponentName, registerCheckbox } from "./registerCheckbox";
import {
  registerConfigProvider,
  registerTokens,
} from "./registerConfigProvider";
import { registerDropdown } from "./registerDropdown";
import {
  InputType,
  registerForm,
  registerFormGroup,
  registerFormItem,
  registerFormList,
} from "./registerForm";
import {
  inputComponentName,
  inputNumberComponentName,
  passwordComponentName,
  registerInput,
  registerNumberInput,
  registerPasswordInput,
  registerTextArea,
  textAreaComponentName,
} from "./registerInput";
import { registerMenu } from "./registerMenu";
import { registerModal } from "./registerModal";
import {
  radioComponentName,
  radioGroupComponentName,
  registerRadio,
} from "./registerRadio";
import {
  optionComponentName,
  optionGroupComponentName,
  registerSelect,
  selectComponentName,
} from "./registerSelect";
import { registerSwitch } from "./registerSwitch";
import { registerTable } from "./registerTable";
import { registerUpload } from "./registerUpload";
import { Registerable } from "./utils";
import {
  datePickerComponentName,
  registerDatePicker,
} from "./registerDatePicker";
import { registerAvatar, registerAvatarGroup } from "./registerAvatar";
import { registerTooltip } from "./registerTooltip";
import { registerColorPicker } from "./registerColorPicker";
import { registerDrawer } from "./registerDrawer";
import { registerSteps } from "./registerSteps";
import { registerDirectoryTree, registerTree } from "./registerTree";

export function registerAll(loader?: Registerable) {
  registerConfigProvider(loader);
  registerTokens(loader);
  registerSelect(loader);
  registerTable(loader);
  registerCheckbox(loader);
  registerSwitch(loader);
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
  registerDatePicker(loader);
  registerUpload(loader);
  registerColorPicker(loader);
  registerDrawer(loader);
  registerSteps(loader);
  registerTooltip(loader);
  registerAvatar(loader);
  registerAvatarGroup(loader);
  registerTree(loader);
  registerDirectoryTree(loader);
}

export { buttonComponentName } from "./registerButton";
export {
  FormType,
  formTypeDescription,
  formComponentName,
  formGroupComponentName,
  formItemComponentName,
  formListComponentName,
  InputType,
} from "./registerForm";

export {
  registerForm,
  registerFormGroup,
  registerFormItem,
} from "./registerForm";

export type { SimplifiedFormItemsProp } from "./registerForm";

export const componentNameToInputType = {
  [inputComponentName]: InputType.Text,
  [textAreaComponentName]: InputType.TextArea,
  [passwordComponentName]: InputType.Password,
  [inputNumberComponentName]: InputType.Number,
  [selectComponentName]: InputType.Select,
  [optionComponentName]: InputType.Option,
  [optionGroupComponentName]: InputType.OptionGroup,
  [radioComponentName]: InputType.Radio,
  [radioGroupComponentName]: InputType.RadioGroup,
  [datePickerComponentName]: InputType.DatePicker,
  [checkboxComponentName]: InputType.Checkbox,
};

export const inputTypeToComponentName = Object.fromEntries(
  Object.entries(componentNameToInputType).map((kv) => kv.reverse())
) as Record<InputType, string>;

export { useFormInstanceMaybe } from "./registerForm";
