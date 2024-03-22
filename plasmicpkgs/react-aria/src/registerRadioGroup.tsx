import React, { ReactNode } from "react";
import type { RadioGroupProps } from "react-aria-components";
import { RadioGroup } from "react-aria-components";
import { getCommonInputProps } from "./common";
import { registerDescription } from "./registerDescription";
import { registerFieldError } from "./registerFieldError";
import { registerLabel } from "./registerLabel";
import { registerRadio } from "./registerRadio";
import {
  CodeComponentMetaOverrides,
  makeChildComponentName,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

interface BaseRadioGroupProps extends RadioGroupProps {
  children?: ReactNode;
}

export function BaseRadioGroup(props: BaseRadioGroupProps) {
  const { children, ...rest } = props;

  return (
    <>
      <RadioGroup {...rest}>{children}</RadioGroup>
    </>
  );
}

const componentName = makeComponentName("radioGroup");

export function registerRadioGroup(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseRadioGroup>
) {
  registerComponentHelper(
    loader,
    BaseRadioGroup,
    {
      name: componentName,
      displayName: "Aria RadioGroup",
      importPath: "@plasmicpkgs/react-aria/skinny/registerRadioGroup",
      importName: "BaseRadioGroup",
      props: {
        ...getCommonInputProps<BaseRadioGroupProps>("radio group", [
          "name",
          "isDisabled",
          "isReadOnly",
          "aria-label",
          "children",
          "isRequired",
        ]),
        value: {
          type: "string",
          editOnly: true,
          uncontrolledProp: "defaultValue",
          description: "The current value",
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
          argTypes: [{ name: "value", type: "string" }],
        },
        onFocusChange: {
          type: "eventHandler",
          argTypes: [{ name: "isFocused", type: "boolean" }],
        },
      },
      states: {
        value: {
          type: "writable",
          valueProp: "value",
          onChangeProp: "onChange",
          variableType: "array",
        },
        isFocused: {
          type: "readonly",
          onChangeProp: "onFocusChange",
          variableType: "boolean",
        },
      },
      trapsFocus: true,
    },
    overrides
  );

  const thisName = makeChildComponentName(
    overrides?.parentComponentName,
    componentName
  );

  registerFieldError(loader, { parentComponentName: thisName });
  registerRadio(loader, { parentComponentName: thisName });
  registerLabel(loader, { parentComponentName: thisName });
  registerDescription(loader, {
    parentComponentName: thisName,
  });
}
