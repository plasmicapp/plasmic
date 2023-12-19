import { InputType } from "./form/Form";
import { registerForm } from "./form/registerForm";
import { registerFormGroup } from "./form/registerFormGroup";
import { registerFormItem } from "./form/registerFormItem";
import { registerFormList } from "./form/registerFormList";
import {
  checkboxComponentName,
  inputComponentName,
  inputNumberComponentName,
  optionComponentName,
  optionGroupComponentName,
  passwordComponentName,
  radioComponentName,
  radioGroupComponentName,
  selectComponentName,
  textAreaComponentName,
} from "./names";
import { registerAvatar, registerAvatarGroup } from "./registerAvatar";
import {
  registerBreadcrumb,
  registerBreadcrumbItem,
} from "./registerBreadcrumb";
import { registerButton } from "./registerButton";
import { registerCheckbox } from "./registerCheckbox";
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
  registerInput,
  registerNumberInput,
  registerPasswordInput,
  registerTextArea,
} from "./registerInput";
import { registerMenu } from "./registerMenu";
import { registerModal } from "./registerModal";
import { registerPagination } from "./registerPagination";
import { registerPopover } from "./registerPopover";
import { registerProgress } from "./registerProgress";
import { registerRadio } from "./registerRadio";
import { registerRate } from "./registerRate";
import { registerSegmented } from "./registerSegmented";
import { registerSelect } from "./registerSelect";
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
  registerBreadcrumb(loader);
  registerBreadcrumbItem(loader);
}

export { FormType, InputType, OPTIMIZED_FORM_IMPORT } from "./form/Form";
export type { SimplifiedFormItemsProp } from "./form/Form";
export { formTypeDescription, registerForm } from "./form/registerForm";
export { deriveFormFieldConfigs } from "./form/SchemaForm";
export * from "./names";

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
