import React from "react";
import type { RadioProps } from "react-aria-components";
import { Radio, RadioGroup } from "react-aria-components";
import ErrorBoundary from "./ErrorBoundary";
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

const RADIO_INTERACTION_VARIANTS = [
  "hovered" as const,
  "pressed" as const,
  "focused" as const,
  "focusVisible" as const,
];

export interface BaseRadioProps extends RadioProps {
  children: React.ReactNode;
  isSelected: boolean;
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof RADIO_INTERACTION_VARIANTS
  >;
}

const { interactionVariants, withObservedValues } = pickAriaComponentVariants(
  RADIO_INTERACTION_VARIANTS
);

export function BaseRadio(props: BaseRadioProps) {
  const { children, updateInteractionVariant, ...rest } = props;

  const radio = (
    <Radio {...rest}>
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
    </Radio>
  );

  return (
    <ErrorBoundary fallback={<RadioGroup>{radio}</RadioGroup>}>
      {radio}
    </ErrorBoundary>
  );
}

export function registerRadio(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseRadio>
) {
  registerComponentHelper(
    loader,
    BaseRadio,
    {
      name: makeComponentName("radio"),
      displayName: "Aria Radio",
      importPath: "@plasmicpkgs/react-aria/skinny/registerRadio",
      importName: "BaseRadio",
      interactionVariants,
      props: {
        ...getCommonInputProps<BaseRadioProps>("radio", [
          "isDisabled",
          "autoFocus",
          "aria-label",
          "children",
        ]),
        value: {
          type: "string",
          description:
            "The value of the input element, used when submitting an HTML form.",
        },
        onSelectionChange: {
          type: "eventHandler",
          argTypes: [{ name: "isSelected", type: "boolean" }],
        },
      },
      states: {
        isSelected: {
          type: "readonly",
          onChangeProp: "onSelectionChange",
          variableType: "boolean",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
