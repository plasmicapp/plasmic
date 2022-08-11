import { Registerable } from "./registerable";
import { registerButton } from "./registerButton";
import { registerCarousel } from "./registerCarousel";
import { registerCheckbox, registerCheckboxGroup } from "./registerCheckbox";
import { registerCollapse, registerCollapsePanel } from "./registerCollapse";
import { registerDropdown, registerDropdownButton } from "./registerDropdown";
import {
  registerInput,
  registerInputGroup,
  registerInputPassword,
  registerInputSearch,
  registerInputTextArea,
} from "./registerInput";
import {
  registerMenu,
  registerMenuDivider,
  registerMenuItem,
  registerMenuItemGroup,
  registerSubMenu,
} from "./registerMenu";
import { registerOptGroup, registerOption } from "./registerOption";
import { registerRate } from "./registerRate";
import { registerSelect } from "./registerSelect";
import { registerSlider } from "./registerSlider";
import { registerSwitch } from "./registerSwitch";
import {
  registerTable,
  registerTableColumn,
  registerTableValue,
} from "./registerTable";
import { registerTabPane, registerTabs } from "./registerTabs";

export * from "./registerable";
export * from "./registerButton";
export * from "./registerCarousel";
export * from "./registerCheckbox";
export * from "./registerCollapse";
export * from "./registerDropdown";
export * from "./registerInput";
export * from "./registerMenu";
export * from "./registerOption";
export * from "./registerRate";
export * from "./registerSelect";
export * from "./registerSlider";
export * from "./registerSwitch";
export * from "./registerTabs";

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
  registerTable(loader);
  registerTableColumn(loader);
  registerTableValue(loader);
  registerTabs(loader);
  registerRate(loader);
}
