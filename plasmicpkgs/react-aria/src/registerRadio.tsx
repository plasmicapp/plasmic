import React, { ReactNode } from "react";
import type { RadioProps } from "react-aria-components";
import { Radio, RadioGroup } from "react-aria-components";
import { getCommonInputProps } from "./common";
import ErrorBoundary from "./ErrorBoundary";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
  ValueObserver,
} from "./utils";

interface BaseRadioProps extends RadioProps {
  onSelectionChange: (isSelected: boolean) => void;
  onPressChange: (isPressed: boolean) => void;
  onFocusVisibleChange: (isFocusVisible: boolean) => void;
}

export function BaseRadio(props: BaseRadioProps) {
  const {
    children,
    onPressChange,
    onFocusVisibleChange,
    onHoverChange,
    onSelectionChange,
    ...rest
  } = props;

  const radio = (
    <Radio {...rest}>
      {({ isFocusVisible, isPressed, isHovered, isSelected }) => (
        <>
          <ValueObserver
            value={isFocusVisible}
            onChange={onFocusVisibleChange}
          />
          <ValueObserver value={isSelected} onChange={onSelectionChange} />
          <ValueObserver value={isPressed} onChange={onPressChange} />
          <ValueObserver value={isHovered} onChange={onHoverChange} />
          {children as ReactNode}
        </>
      )}
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
        onHoverChange: {
          type: "eventHandler",
          argTypes: [{ name: "isHovered", type: "boolean" }],
        },
        onFocusChange: {
          type: "eventHandler",
          argTypes: [{ name: "isFocused", type: "boolean" }],
        },
        onPressChange: {
          type: "eventHandler",
          argTypes: [{ name: "isPressed", type: "boolean" }],
        },
        onFocusVisibleChange: {
          type: "eventHandler",
          argTypes: [{ name: "isFocusVisible", type: "boolean" }],
        },
        onSelectionChange: {
          type: "eventHandler",
          argTypes: [{ name: "isSelected", type: "boolean" }],
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
