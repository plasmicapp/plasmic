import React, { ReactNode } from "react";
import type { InputProps, TextFieldProps } from "react-aria-components";
import { TextField } from "react-aria-components";
import { COMMON_STYLES, getCommonProps, resolveAutoComplete } from "./common";
import { PlasmicTextFieldContext } from "./contexts";
import { DESCRIPTION_COMPONENT_NAME } from "./registerDescription";
import { INPUT_COMPONENT_NAME } from "./registerInput";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";
import { WithVariants, pickAriaComponentVariants } from "./variant-utils";

const TEXT_FIELD_VARIANTS = ["disabled" as const, "readonly" as const];

export interface BaseTextFieldProps
  extends Omit<TextFieldProps, "autoComplete">,
    WithVariants<typeof TEXT_FIELD_VARIANTS> {
  label?: ReactNode;
  description?: ReactNode;
  multiline?: boolean;
  inputProps?: InputProps;
  autoComplete?: string[];
  children: ReactNode;
}

const { variants, withObservedValues } =
  pickAriaComponentVariants(TEXT_FIELD_VARIANTS);

export function BaseTextField(props: BaseTextFieldProps) {
  const { children, plasmicUpdateVariant, autoComplete, ...rest } = props;

  return (
    <PlasmicTextFieldContext.Provider value={props}>
      <TextField
        autoComplete={resolveAutoComplete(autoComplete)}
        {...rest}
        style={COMMON_STYLES}
      >
        {({ isDisabled, isReadOnly }) =>
          withObservedValues(
            children,
            {
              disabled: isDisabled,
              readonly: isReadOnly,
            },
            plasmicUpdateVariant
          )
        }
      </TextField>
    </PlasmicTextFieldContext.Provider>
  );
}

export const TEXT_FIELD_COMPONENT_NAME = makeComponentName("textField");

export function registerTextField(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseTextField>
) {
  registerComponentHelper(
    loader,
    BaseTextField,
    {
      name: TEXT_FIELD_COMPONENT_NAME,
      displayName: "Aria TextField",
      importPath: "@plasmicpkgs/react-aria/skinny/registerTextField",
      importName: "BaseTextField",
      variants,
      // TODO: Support for validate prop
      props: {
        ...getCommonProps<BaseTextFieldProps>("Text Field", [
          "name",
          "isDisabled",
          "isReadOnly",
          "autoFocus",
          "aria-label",
          "isRequired",
          "value",
          "maxLength",
          "minLength",
          "pattern",
          "type",
          "inputMode",
          "validationBehavior",
          "autoComplete",
          "onChange",
          "onFocus",
          "onBlur",
          "onFocusChange",
          "onKeyDown",
          "onKeyUp",
          "onCopy",
          "onCut",
          "onPaste",
          "onCompositionStart",
          "onCompositionEnd",
          "onCompositionUpdate",
          "onSelect",
          "onBeforeInput",
          "onInput",
        ]),
        children: {
          type: "slot",
          mergeWithParent: true,
          defaultValue: {
            type: "vbox",
            styles: {
              justifyContent: "flex-start",
              alignItems: "flex-start",
              width: "300px",
              gap: "5px",
              padding: 0,
            },
            children: [
              {
                type: "component",
                name: LABEL_COMPONENT_NAME,
                props: {
                  children: {
                    type: "text",
                    value: "Label",
                  },
                },
              },
              {
                type: "component",
                name: INPUT_COMPONENT_NAME,
                styles: {
                  width: "100%",
                },
              },
              {
                type: "component",
                name: DESCRIPTION_COMPONENT_NAME,
                props: {
                  children: {
                    type: "text",
                    value: "Type something...",
                  },
                },
              },
            ],
          },
        },

        isInvalid: {
          // TODO: Not sure if needed
          displayName: "Invalid",
          type: "boolean",
          description: "Whether the input value is invalid",
          defaultValueHint: false,
        },
        customValidationErrors: {
          // TODO: Not sure if needed
          type: "array",
          description: "Errors for custom validation",
        },
      },
      states: {
        value: {
          type: "writable",
          valueProp: "value",
          onChangeProp: "onChange",
          variableType: "text",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
