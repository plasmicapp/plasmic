import React from "react";
import type { ButtonProps } from "react-aria-components";
import { Button } from "react-aria-components";
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

const BUTTON_INTERACTION_VARIANTS = [
  "hovered" as const,
  "pressed" as const,
  "focused" as const,
  "focusVisible" as const,
];

const { interactionVariants, withObservedValues } = pickAriaComponentVariants(
  BUTTON_INTERACTION_VARIANTS
);

interface BaseButtonProps extends ButtonProps {
  children: React.ReactNode;
  resetsForm?: boolean;
  submitsForm?: boolean;
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof BUTTON_INTERACTION_VARIANTS
  >;
}

export function BaseButton(props: BaseButtonProps) {
  const {
    submitsForm,
    resetsForm,
    children,
    updateInteractionVariant,
    ...rest
  } = props;

  const type = submitsForm ? "submit" : resetsForm ? "reset" : "button";

  return (
    <Button type={type} {...rest}>
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
    </Button>
  );
}

export function registerButton(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseButton>
) {
  registerComponentHelper(
    loader,
    BaseButton,
    {
      name: makeComponentName("button"),
      displayName: "Aria Button",
      importPath: "@plasmicpkgs/react-aria/skinny/registerButton",
      importName: "BaseButton",
      interactionVariants,
      props: {
        ...getCommonInputProps<BaseButtonProps>("button", [
          "isDisabled",
          "aria-label",
          "children",
        ]),
        submitsForm: {
          type: "boolean",
          displayName: "Submits form?",
          defaultValueHint: false,
          hidden: (ps: BaseButtonProps) => Boolean(ps.resetsForm),
          description:
            "Whether clicking this button should submit the enclosing form.",
          advanced: true,
        },
        resetsForm: {
          type: "boolean",
          displayName: "Resets form?",
          defaultValueHint: false,
          hidden: (ps: BaseButtonProps) => Boolean(ps.submitsForm),
          description:
            "Whether clicking this button should reset the enclosing form.",
          advanced: true,
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
