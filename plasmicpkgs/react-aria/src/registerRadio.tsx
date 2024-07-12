import { PlasmicElement } from "@plasmicapp/host";
import React from "react";
import type { RadioProps } from "react-aria-components";
import { Radio, RadioGroup } from "react-aria-components";
import ErrorBoundary from "./ErrorBoundary";
import { getCommonInputProps } from "./common";
import { PlasmicRadioGroupContext } from "./contexts";
import {
  UpdateInteractionVariant,
  pickAriaComponentVariants,
} from "./interaction-variant-utils";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import {
  BaseControlContextData,
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
  setControlContextData?: (ctxData: BaseControlContextData) => void;
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
  const { children, updateInteractionVariant, setControlContextData, ...rest } =
    props;
  const contextProps = React.useContext(PlasmicRadioGroupContext);

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

  const isStandalone = !contextProps;

  setControlContextData?.({
    isStandalone,
  });

  return (
    <ErrorBoundary fallback={<RadioGroup>{radio}</RadioGroup>}>
      {radio}
    </ErrorBoundary>
  );
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
        ...getCommonInputProps<BaseRadioProps>("radio", [
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
          hidden: (_ps: BaseRadioProps, ctx: BaseControlContextData | null) =>
            !ctx?.isStandalone,
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
