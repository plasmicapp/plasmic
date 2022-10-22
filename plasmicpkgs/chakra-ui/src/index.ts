import { Registerable } from "./registerable";
import {
  registerAccordion,
  registerAccordionButton,
  registerAccordionIcon,
  registerAccordionItem,
  registerAccordionPanel,
} from "./registerAccordion";
import { registerAspectRatio } from "./registerAspectRatio";
import {
  registerAvatar,
  registerAvatarBadge,
  registerAvatarGroup,
} from "./registerAvatar";
import { registerBadge } from "./registerBadge";
import {
  registerBreadcrumb,
  registerBreadcrumbItem,
  registerBreadcrumbLink,
  registerBreadcrumbSeparator,
} from "./registerBreadcrumb";
import { registerButton, registerButtonGroup } from "./registerButton";
import { registerChakraProvider } from "./registerChakraProvider";
import { registerCheckbox, registerCheckboxGroup } from "./registerCheckBox";
import { registerCode } from "./registerCode";
import { registerDivider } from "./registerDivider";
import {
  registerFormControl,
  registerFormErrorMessage,
  registerFormHelperText,
  registerFormLabel,
} from "./registerFormControl";
import { registerHeading } from "./registerHeading";
import { registerHighlight } from "./registerHighlight";
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
import { registerProgress } from "./registerProgress";
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
import { registerToast } from "./registerToast";
import { registerTooltip } from "./registerTooltip";

export * from "./registerable";
export * from "./registerAccordion";
export * from "./registerAspectRatio";
export * from "./registerAvatar";
export * from "./registerBadge";
export * from "./registerBreadcrumb";
export * from "./registerButton";
export * from "./registerChakraProvider";
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
  registerAccordion(loader);
  registerAccordionButton(loader);
  registerAccordionIcon(loader);
  registerAccordionItem(loader);
  registerAccordionPanel(loader);
  registerAvatar(loader);
  registerAvatarBadge(loader);
  registerAvatarGroup(loader);
  registerAspectRatio(loader);
  registerBadge(loader);
  registerBreadcrumb(loader);
  registerBreadcrumbItem(loader);
  registerBreadcrumbLink(loader);
  registerBreadcrumbSeparator(loader);
  registerButton(loader);
  registerButtonGroup(loader);
  registerChakraProvider(loader);
  registerCheckbox(loader);
  registerCheckboxGroup(loader);
  registerCode(loader);
  registerDivider(loader);
  registerFormControl(loader);
  registerFormErrorMessage(loader);
  registerFormHelperText(loader);
  registerFormLabel(loader);
  registerHeading(loader);
  registerHighlight(loader);
  registerImage(loader);
  registerInput(loader);
  registerKbd(loader);
  registerNumberInput(loader);
  registerNumberDecrementStepper(loader);
  registerNumberIncrementStepper(loader);
  registerNumberInputField(loader);
  registerNumberInputStepper(loader);
  registerOption(loader);
  registerPinInput(loader);
  registerPinInputField(loader);
  registerPopover(loader);
  registerPopoverBody(loader);
  registerPopoverArrow(loader);
  registerPopoverCloseButton(loader);
  registerPopoverContent(loader);
  registerPopoverHeader(loader);
  registerPopoverTrigger(loader);
  registerProgress(loader);
  registerRadio(loader);
  registerRadioGroup(loader);
  registerSelect(loader);
  registerStat(loader);
  registerStatArrow(loader);
  registerStatHelpText(loader);
  registerStatLabel(loader);
  registerStatNumber(loader);
  registerSwitch(loader);
  registerTable(loader);
  registerTableCaption(loader);
  registerTbody(loader);
  registerTfoot(loader);
  registerThead(loader);
  registerTd(loader);
  registerTh(loader);
  registerTr(loader);
  registerTableContainer(loader);
  registerTabList(loader);
  registerTab(loader);
  registerTabPanel(loader);
  registerTabPanels(loader);
  registerTabs(loader);
  registerText(loader);
  registerToast(loader);
  registerTooltip(loader);
}
