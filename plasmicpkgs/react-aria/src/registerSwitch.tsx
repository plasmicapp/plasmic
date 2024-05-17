import React from "react";
import type { SwitchProps } from "react-aria-components";
import { Switch } from "react-aria-components";
import { getCommonInputProps } from "./common";
import {
  UpdateInteractionVariant,
  pickAriaComponentVariants,
} from "./interaction-variant-utils";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";

const SWITCH_INTERACTION_VARIANTS = [
  "hovered" as const,
  "pressed" as const,
  "focused" as const,
  "focusVisible" as const,
];

const { interactionVariants, withObservedValues } = pickAriaComponentVariants(
  SWITCH_INTERACTION_VARIANTS
);

interface BaseSwitchProps extends SwitchProps {
  children: React.ReactNode;
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof SWITCH_INTERACTION_VARIANTS
  >;
}

export function BaseSwitch(props: BaseSwitchProps) {
  const { children, updateInteractionVariant, ...rest } = props;

  return (
    <Switch {...rest}>
      {({ isHovered, isPressed, isFocused, isFocusVisible }) =>
        withObservedValues(
          children,
          {
            hovered: isHovered,
            pressed: isPressed,
            focused: isFocused,
            focusVisible: isFocusVisible,
          },
          updateInteractionVariant
        )
      }
    </Switch>
  );
}

export function registerSwitch(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseSwitch>
) {
  registerComponentHelper(
    loader,
    BaseSwitch,
    {
      name: makeComponentName("switch"),
      displayName: "Aria Switch",
      importPath: "@plasmicpkgs/react-aria/skinny/registerSwitch",
      importName: "BaseSwitch",
      interactionVariants,
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
      },
      states: {
        isSelected: {
          type: "writable",
          valueProp: "value",
          onChangeProp: "onChange",
          variableType: "boolean",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
