import React from "react";
import type { ButtonProps } from "react-aria-components";
import { Button } from "react-aria-components";
import { getCommonInputProps } from "./common";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
  ValueObserver,
} from "./utils";

interface BaseButtonProps extends ButtonProps {
  resetsForm?: boolean;
  submitsForm?: boolean;
  onFocusVisibleChange?: (isFocusVisible: boolean) => void;
}

export function BaseButton(props: BaseButtonProps) {
  const { submitsForm, onFocusVisibleChange, resetsForm, children, ...rest } =
    props;
  const type = submitsForm ? "submit" : resetsForm ? "reset" : "button";
  return (
    <Button type={type} {...rest}>
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
