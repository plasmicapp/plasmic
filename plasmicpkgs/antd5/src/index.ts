import { registerAvatar, registerAvatarGroup } from "./registerAvatar";
import { registerButton } from "./registerButton";
import { checkboxComponentName, registerCheckbox } from "./registerCheckbox";
import { registerCollapse } from "./registerCollapse";
import { registerColorPicker } from "./registerColorPicker";
import {
  registerConfigProvider,
  registerTokens,
} from "./registerConfigProvider";
import {
  datePickerComponentName,
  registerDatePicker,
} from "./registerDatePicker";
import { registerDateRangePicker } from "./registerDateRangePicker";
import { registerDrawer } from "./registerDrawer";
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
import { registerPagination } from "./registerPagination";
import { registerPopover } from "./registerPopover";
import { registerProgress } from "./registerProgress";
import {
  radioComponentName,
  radioGroupComponentName,
  registerRadio,
} from "./registerRadio";
import { registerRate } from "./registerRate";
import { registerSegmented } from "./registerSegmented";
import {
  optionComponentName,
  optionGroupComponentName,
  registerSelect,
  selectComponentName,
} from "./registerSelect";
import { registerSlider } from "./registerSlider";
import { registerSteps } from "./registerSteps";
import { registerSwitch } from "./registerSwitch";
import { registerTable } from "./registerTable";
import { registerTabs } from "./registerTabs";
import { registerTooltip } from "./registerTooltip";
import { registerDirectoryTree, registerTree } from "./registerTree";
import { registerUpload } from "./registerUpload";
import { Registerable } from "./utils";

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
  registerDateRangePicker(loader);
  registerUpload(loader);
  registerColorPicker(loader);
  registerDrawer(loader);
  registerSteps(loader);
  registerTooltip(loader);
  registerAvatar(loader);
  registerAvatarGroup(loader);
  registerTree(loader);
  registerDirectoryTree(loader);
  registerCollapse(loader);
  registerPopover(loader);
  registerTabs(loader);
  registerRate(loader);
  registerSlider(loader);
  registerSegmented(loader);
  registerProgress(loader);
  registerPagination(loader);
}

export { buttonComponentName } from "./registerButton";
export {
  deriveFormFieldConfigs,
  formComponentName,
  formGroupComponentName,
  formItemComponentName,
  formListComponentName,
  FormType,
  formTypeDescription,
  InputType,
  registerForm,
  registerFormGroup,
  registerFormItem,
  useFormInstanceMaybe,
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
