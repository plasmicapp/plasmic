import React from "react";
import type { ButtonProps } from "react-aria-components";
import { Button } from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
  ValueObserver,
} from "./utils";

interface BaseButtonProps extends ButtonProps {
  submitsForm?: boolean;
  onFocusVisibleChange?: (isFocusVisible: boolean) => void;
}

export function BaseButton(props: BaseButtonProps) {
  const { submitsForm, onFocusVisibleChange, children, ...rest } = props;

  return (
    <Button type={submitsForm ? "submit" : "button"} {...rest}>
      {({ isFocusVisible }) => (
        <>
          <ValueObserver
            value={isFocusVisible}
            onChange={onFocusVisibleChange}
          />
          {children}
        </>
      )}
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
      displayName: "BaseButton",
      importPath: "@plasmicpkgs/react-aria/registerButton",
      importName: "BaseButton",
      props: {
        children: {
          type: "slot",
          mergeWithParent: true as any,
        },
        isDisabled: {
          displayName: "Disabled",
          type: "boolean",
          description: "Whether the button is disabled",
          defaultValueHint: false,
        },
        submitsForm: {
          type: "boolean",
          displayName: "Submits form?",
          defaultValueHint: false,
          description:
            "Whether clicking this button should submit the enclosing form.",
          advanced: true,
        },
        "aria-label": {
          type: "string",
          displayName: "Aria Label",
          description:
            "Label for this button, if no visible label is used (e.g. an icon only button)",
          advanced: true,
        },
        onPress: {
          type: "eventHandler",
          argTypes: [{ name: "event", type: "object" }],
        },
        onHoverChange: {
          type: "eventHandler",
          argTypes: [{ name: "isHovered", type: "boolean" }],
        },
        onPressChange: {
          type: "eventHandler",
          argTypes: [{ name: "isPressed", type: "boolean" }],
        },
        onFocusChange: {
          type: "eventHandler",
          argTypes: [{ name: "isFocused", type: "boolean" }],
        },
        onFocusVisibleChange: {
          type: "eventHandler",
          argTypes: [{ name: "isFocusVisible", type: "boolean" }],
        },
      },
      states: {
        isHovered: {
          type: "readonly",
          onChangeProp: "onHoverChange",
          variableType: "boolean",
        },
        isPressed: {
          type: "readonly",
          onChangeProp: "onPressChange",
          variableType: "boolean",
        },
        isFocused: {
          type: "readonly",
          onChangeProp: "onFocusChange",
          variableType: "boolean",
        },
        isFocusVisible: {
          type: "readonly",
          onChangeProp: "onFocusVisibleChange",
          variableType: "boolean",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
