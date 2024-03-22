import React from "react";
import type { CheckboxProps } from "react-aria-components";
import { Checkbox } from "react-aria-components";
import { getCommonInputProps } from "./common";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
  ValueObserver,
} from "./utils";

interface BaseCheckboxProps extends CheckboxProps {
  onPressChange: (isPressed: boolean) => void;
  onFocusVisibleChange: (isFocusVisible: boolean) => void;
  onInvalidChange: (isInvalid: boolean) => void;
}

export function BaseCheckbox(props: BaseCheckboxProps) {
  const {
    children,
    onPressChange,
    onFocusVisibleChange,
    onInvalidChange,
    ...rest
  } = props;

  return (
    <>
      <Checkbox {...rest}>
        {({ isFocusVisible, isPressed, isInvalid }) => (
          <>
            <ValueObserver
              value={isFocusVisible}
              onChange={onFocusVisibleChange}
            />
            <ValueObserver value={isPressed} onChange={onPressChange} />
            <ValueObserver value={isInvalid} onChange={onInvalidChange} />
            {children}
          </>
        )}
      </Checkbox>
    </>
  );
}

export function registerCheckbox(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseCheckbox>
) {
  registerComponentHelper(
    loader,
    BaseCheckbox,
    {
      name: makeComponentName("checkbox"),
      displayName: "Aria Checkbox",
      importPath: "@plasmicpkgs/react-aria/skinny/registerCheckbox",
      importName: "BaseCheckbox",
      props: {
        ...getCommonInputProps<BaseCheckboxProps>("checkbox", [
          "name",
          "isDisabled",
          "isReadOnly",
          "aria-label",
          "children",
          "isRequired",
          "autoFocus",
        ]),
        value: {
          type: "string",
          description:
            "The value of the input element, used when submitting an HTML form.",
        },
        isSelected: {
          type: "boolean",
          editOnly: true,
          uncontrolledProp: "defaultSelected",
          description: "Whether the checkbox is toggled on",
          defaultValueHint: false,
        },
        isIndeterminate: {
          displayName: "Indeterminate",
          type: "boolean",
          description:
            "This state indicates that the checkbox is neither fully checked nor unchecked. It typically represents a partial selection when dealing with groups of options. Some but not all items in the group are selected, resulting in an indeterminate state for the checkbox.",
          defaultValueHint: false,
        },
        isInvalid: {
          displayName: "Invalid",
          type: "boolean",
          description: "Whether the input value is invalid",
          defaultValueHint: false,
        },
        validationBehavior: {
          type: "choice",
          options: ["native", "aria"],
          description:
            "Whether to use native HTML form validation to prevent form submission when the value is missing or invalid, or mark the field as required or invalid via ARIA.",
          defaultValueHint: "native",
        },
        onChange: {
          type: "eventHandler",
          argTypes: [{ name: "isSelected", type: "boolean" }],
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
        onInvalidChange: {
          type: "eventHandler",
          argTypes: [{ name: "isInvalid", type: "boolean" }],
        },
      },
      states: {
        isSelected: {
          type: "writable",
          valueProp: "isSelected",
          onChangeProp: "onChange",
          variableType: "boolean",
        },
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
        isInvalid: {
          type: "readonly",
          onChangeProp: "onInvalidChange",
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
