import { Registerable } from "./registerable";
import { registerButton } from "./registerButton";
import { registerCheckbox, registerCheckboxGroup } from "./registerCheckbox";
import { registerCarousel } from "./registerCarousel";
import { registerCollapse, registerCollapsePanel } from "./registerCollapse";
import { registerDropdown, registerDropdownButton } from "./registerDropdown";
import {
  registerInput,
  registerInputTextArea,
  registerInputSearch,
  registerInputPassword,
  registerInputGroup,
} from "./registerInput";
import {
  registerMenu,
  registerMenuDivider,
  registerMenuItem,
  registerMenuItemGroup,
  registerSubMenu,
} from "./registerMenu";
import { registerRate } from "./registerRate";
import { registerOptGroup, registerOption } from "./registerOption";
import { registerSelect } from "./registerSelect";
import { registerSlider } from "./registerSlider";
import { registerSwitch } from "./registerSwitch";
import { registerTabPane, registerTabs } from "./registerTabs";

export * from "./registerable";
export * from "./registerButton";
export * from "./registerCheckbox";
export * from "./registerCollapse";
export * from "./registerDropdown";
export * from "./registerInput";
export * from "./registerMenu";
export * from "./registerOption";
export * from "./registerSelect";
export * from "./registerSlider";
export * from "./registerSwitch";
export * from "./registerCarousel";
export * from "./registerTabs";
export * from "./registerRate";

export function registerAll(loader?: Registerable) {
  registerButton(loader);
  registerSlider(loader);
  registerSwitch(loader);
  registerOption(loader);
  registerOptGroup(loader);
  registerSelect(loader);
  registerCollapsePanel(loader);
  registerCollapse(loader);
  registerCheckbox(loader);
  registerCheckboxGroup(loader);
  registerMenuDivider(loader);
  registerMenuItem(loader);
  registerMenuItemGroup(loader);
  registerSubMenu(loader);
  registerMenu(loader);
  registerDropdown(loader);
  registerDropdownButton(loader);
  registerCarousel(loader);
  registerInput(loader);
  registerInputTextArea(loader);
  registerInputSearch(loader);
  registerInputPassword(loader);
  registerInputGroup(loader);
  registerTabPane(loader);
  registerTabs(loader);
  registerRate(loader);
}
