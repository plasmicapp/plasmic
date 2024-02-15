import type { SwitchProps } from "react-aria-components";
import { Switch } from "react-aria-components";
import { getCommonInputProps } from "./common";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export const BaseSwitch = Switch;

export function registerSwitch(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseSwitch>
) {
  registerComponentHelper(
    loader,
    BaseSwitch,
    {
      name: makeComponentName("switch"),
      displayName: "BaseSwitch",
      importPath: "@plasmicpkgs/react-aria/registerSwitch",
      importName: "BaseSwitch",
      props: {
        ...getCommonInputProps<SwitchProps>("switch", [
          "name",
          "isDisabled",
          "isReadOnly",
          "autoFocus",
          "aria-label",
          "children",
        ]),
        value: {
          type: "boolean",
          editOnly: true,
          uncontrolledProp: "defaultSelected",
          description: "Whether the switch is toggled on",
          defaultValueHint: false,
        },
        onChange: {
          type: "eventHandler",
          argTypes: [{ name: "isSelected", type: "boolean" }],
        },
        onHoverChange: {
          type: "eventHandler",
          argTypes: [{ name: "isHovered", type: "boolean" }],
        },
      },
      states: {
        isSelected: {
          type: "writable",
          valueProp: "value",
          onChangeProp: "onChange",
          variableType: "boolean",
        },
        isHovered: {
          type: "readonly",
          onChangeProp: "onHoverChange",
          variableType: "boolean",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
