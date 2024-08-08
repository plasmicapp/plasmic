import { PlasmicElement } from "@plasmicapp/host";
import React from "react";
import type { RadioProps } from "react-aria-components";
import { Radio, RadioGroup } from "react-aria-components";
import { getCommonProps } from "./common";
import { PlasmicRadioGroupContext } from "./contexts";
import {
  UpdateInteractionVariant,
  pickAriaComponentVariants,
} from "./interaction-variant-utils";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import {
  CodeComponentMetaOverrides,
  HasControlContextData,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";

const RADIO_INTERACTION_VARIANTS = [
  "selected" as const,
  "hovered" as const,
  "pressed" as const,
  "focused" as const,
  "focusVisible" as const,
  "disabled" as const,
  "readonly" as const,
  "selected" as const,
];

export interface BaseRadioProps extends RadioProps, HasControlContextData {
  children: React.ReactNode;
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
  const { children, setControlContextData, updateInteractionVariant, ...rest } =
    props;
  const contextProps = React.useContext(PlasmicRadioGroupContext);
  const isStandalone = !contextProps;

  setControlContextData?.({
    parent: contextProps,
  });

  const radio = (
    <Radio {...rest}>
      {({
        isHovered,
        isPressed,
        isFocused,
        isFocusVisible,
        isSelected,
        isDisabled,
        isReadOnly,
      }) =>
        withObservedValues(
          children,
          {
            hovered: isHovered,
            pressed: isPressed,
            focused: isFocused,
            focusVisible: isFocusVisible,
            selected: isSelected,
            disabled: isDisabled,
            readonly: isReadOnly,
          },
          updateInteractionVariant
        )
      }
    </Radio>
  );

  if (isStandalone) {
    return <RadioGroup>{radio}</RadioGroup>;
  }

  return radio;
}

export const makeDefaultRadioChildren = (label: string): PlasmicElement => ({
  type: "hbox",
  styles: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: 0,
  },
  children: [
    {
      type: "box",
      styles: {
        width: "7px",
        height: "7px",
        borderRadius: "100%",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "black",
      },
    },
    {
      type: "component",
      name: LABEL_COMPONENT_NAME,
      props: {
        children: {
          type: "text",
          value: label,
        },
      },
    },
  ],
});

export function registerRadio(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseRadio>
) {
  return registerComponentHelper(
    loader,
    BaseRadio,
    {
      name: makeComponentName("radio"),
      displayName: "Aria Radio",
      importPath: "@plasmicpkgs/react-aria/skinny/registerRadio",
      importName: "BaseRadio",
      interactionVariants,
      props: {
        ...getCommonProps<BaseRadioProps>("radio", [
          "isDisabled",
          "autoFocus",
          "aria-label",
        ]),
        children: {
          type: "slot",
          mergeWithParent: true as any,
          defaultValue: makeDefaultRadioChildren("Radio"),
        },
        value: {
          type: "string",
          description:
            "The value of the input element, used when submitting an HTML form.",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
