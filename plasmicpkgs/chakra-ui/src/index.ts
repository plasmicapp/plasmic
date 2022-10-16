import { Registerable } from "./registerable";
import { registerAspectRatio } from "./registerAspectRatio";
import { registerBadge } from "./registerBadge";
import {
  registerBreadcrumb,
  registerBreadcrumbItem,
  registerBreadcrumbLink,
  registerBreadcrumbSeparator,
} from "./registerBreadcrumb";
import { registerButton, registerButtonGroup } from "./registerButton";
import { registerCheckbox, registerCheckboxGroup } from "./registerCheckBox";
import { registerCode } from "./registerCode";
import { registerDivider } from "./registerDivider";
import { registerImage } from "./registerImage";
import { registerInput } from "./registerInput";
import { registerKbd } from "./registerKbd";
import {
  registerNumberDecrementStepper,
  registerNumberIncrementStepper,
  registerNumberInput,
  registerNumberInputField,
  registerNumberInputStepper,
} from "./registerNumberInput";
import { registerPinInput, registerPinInputField } from "./registerPinInput";
import {
  registerPopover,
  registerPopoverArrow,
  registerPopoverBody,
  registerPopoverCloseButton,
  registerPopoverContent,
  registerPopoverHeader,
  registerPopoverTrigger,
} from "./registerPopover";
import { registerRadio, registerRadioGroup } from "./registerRadio";
import { registerOption, registerSelect } from "./registerSelect";

import {
  registerStat,
  registerStatArrow,
  registerStatHelpText,
  registerStatLabel,
  registerStatNumber,
} from "./registerStat";
import { registerSwitch } from "./registerSwitch";

import {
  registerTable,
  registerTableCaption,
  registerTableContainer,
  registerTbody,
  registerTd,
  registerTfoot,
  registerTh,
  registerThead,
  registerTr,
} from "./registerTable";
import {
  registerTab,
  registerTabList,
  registerTabPanel,
  registerTabPanels,
  registerTabs,
} from "./registerTabs";

import { registerText } from "./registerText";

import { registerHighlight } from "./registerHighlight";

import { registerHeading } from "./registerHeading";

import { registerToast } from "./registerToast";

import { registerTooltip } from "./registerTooltip";

import {
  registerAccordion,
  registerAccordionButton,
  registerAccordionIcon,
  registerAccordionItem,
  registerAccordionPanel,
} from "./registerAccordion";
import {
  registerAvatar,
  registerAvatarBadge,
  registerAvatarGroup,
} from "./registerAvatar";
import {
  registerFormControl,
  registerFormErrorMessage,
  registerFormHelperText,
  registerFormLabel,
} from "./registerFormControl";
import { registerProgress } from "./registerProgress";

export * from "./registerable";
export * from "./registerAccordion";
export * from "./registerAspectRatio";
export * from "./registerAvatar";
export * from "./registerBadge";
export * from "./registerBreadcrumb";
export * from "./registerButton";
export * from "./registerCheckBox";
export * from "./registerCode";
export * from "./registerDivider";
export * from "./registerFormControl";
export * from "./registerHeading";
export * from "./registerHighlight";
export * from "./registerImage";
export * from "./registerInput";
export * from "./registerKbd";
export * from "./registerNumberInput";
export * from "./registerPinInput";
export * from "./registerPopover";
export * from "./registerProgress";
export * from "./registerRadio";
export * from "./registerSelect";
export * from "./registerStat";
export * from "./registerSwitch";
export * from "./registerTable";
export * from "./registerTabs";
export * from "./registerText";
export * from "./registerToast";
export * from "./registerTooltip";

export function registerAll(loader?: Registerable) {
  registerAspectRatio(loader);
  registerBadge(loader);
  registerBreadcrumb(loader);
  registerBreadcrumbItem(loader);
  registerBreadcrumbLink(loader);
  registerBreadcrumbSeparator(loader);
  registerButton(loader);
  registerButtonGroup(loader);
  registerCheckbox(loader);
  registerCheckboxGroup(loader);
  registerCode(loader);
  registerDivider(loader);
  registerImage(loader);
  registerInput(loader);
  registerKbd(loader);
  registerNumberInput(loader);
  registerNumberInputStepper(loader);
  registerNumberDecrementStepper(loader);
  registerNumberIncrementStepper(loader);
  registerNumberInputField(loader);
  registerPinInput(loader);
  registerPinInputField(loader);
  registerPopover(loader);
  registerPopoverContent(loader);
  registerPopoverArrow(loader);
  registerPopoverCloseButton(loader);
  registerPopoverHeader(loader);
  registerPopoverBody(loader);
  registerPopoverTrigger(loader);
  registerRadio(loader);
  registerRadioGroup(loader);
  registerSelect(loader);
  registerOption(loader);
  registerStat(loader);
  registerStatHelpText(loader);
  registerStatArrow(loader);
  registerStatNumber(loader);
  registerStatLabel(loader);
  registerSwitch(loader);
  registerTable(loader);
  registerTableCaption(loader);
  registerThead(loader);
  registerTbody(loader);
  registerTr(loader);
  registerTd(loader);
  registerTh(loader);
  registerTableContainer(loader);
  registerTabList(loader);
  registerTabs(loader);
  registerTab(loader);
  registerTabPanels(loader);
  registerTabPanel(loader);
  registerText(loader);
  registerTfoot(loader);
  registerHighlight(loader);
  registerHeading(loader);
  registerToast(loader);
  registerTooltip(loader);
  registerAvatarBadge(loader);
  registerAvatar(loader);
  registerAvatarGroup(loader);
  registerAccordion(loader);
  registerAccordionItem(loader);
  registerAccordionButton(loader);
  registerAccordionPanel(loader);
  registerAccordionIcon(loader);
  registerFormControl(loader);
  registerFormLabel(loader);
  registerFormHelperText(loader);
  registerFormErrorMessage(loader);
  registerProgress(loader);
}
