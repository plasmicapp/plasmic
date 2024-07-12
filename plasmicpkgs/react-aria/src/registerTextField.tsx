import React, { ReactNode } from "react";
import type { InputProps, TextFieldProps } from "react-aria-components";
import { TextField } from "react-aria-components";
import { getCommonInputProps } from "./common";
import { DESCRIPTION_COMPONENT_NAME } from "./registerDescription";
import { registerFieldError } from "./registerFieldError";
import { INPUT_COMPONENT_NAME, registerInput } from "./registerInput";
import { LABEL_COMPONENT_NAME, registerLabel } from "./registerLabel";
import { registerTextArea } from "./registerTextArea";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeChildComponentName,
  makeComponentName,
  registerComponentHelper,
} from "./utils";

interface BaseTextFieldProps extends TextFieldProps {
  label?: ReactNode;
  description?: ReactNode;
  enableAutoComplete?: boolean;
  multiline?: boolean;
  inputProps?: InputProps;
  children: ReactNode;
}

export function BaseTextField(props: BaseTextFieldProps) {
  const { enableAutoComplete, autoComplete, children, ...rest } = props;

  return (
    <TextField
      autoComplete={enableAutoComplete ? autoComplete : undefined}
      {...rest}
    >
      {children}
    </TextField>
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
      // TODO: Support for validate prop
      props: {
        ...getCommonInputProps<BaseTextFieldProps>("input", [
          "name",
          "isDisabled",
          "isReadOnly",
          "autoFocus",
          "aria-label",
          "isRequired",
        ]),
        children: {
          type: "slot",
          mergeWithParent: true as any,
          defaultValue: {
            type: "vbox",
            styles: {
              justifyContent: "flex-start",
              alignItems: "flex-start",
              width: "300px",
              gap: "5px",
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
        value: {
          type: "string",
          editOnly: true,
          uncontrolledProp: "defaultValue",
          description: "The current value",
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
        // validate: {
        //   type: "function" as const,
        //   argNames: ["value"],
        //   argValues: (_ps: any, ctx: any) => [ctx.data[0]],
        // },
        enableAutoComplete: {
          type: "boolean",
          description:
            "Whether the browser is allowed to automatically complete the input",
          defaultValueHint: false,
        },
        autoComplete: {
          type: "choice",
          hidden: ({ enableAutoComplete }: BaseTextFieldProps) =>
            !enableAutoComplete,
          description: "Guidance as to the type of data expected in the field",
          helpText:
            "For explanations on what each of the values mean, check https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values",
          options: [
            "name",
            "honorific-prefix",
            "given-name",
            "additional-name",
            "family-name",
            "honorific-suffix",
            "nickname",
            "email",
            "username",
            "new-password",
            "current-password",
            "one-time-code",
            "organization-title",
            "organization",
            "street-address",
            "shipping",
            "billing",
            "address-line1",
            "address-line2",
            "address-line3",
            "address-level4",
            "address-level3",
            "address-level2",
            "address-level1",
            "country",
            "country-name",
            "postal-code",
            "cc-name",
            "cc-given-name",
            "cc-additional-name",
            "cc-family-name",
            "cc-number",
            "cc-exp",
            "cc-exp-month",
            "cc-exp-year",
            "cc-csc",
            "cc-type",
            "transaction-currency",
            "transaction-amount",
            "language",
            "bday",
            "bday-day",
            "bday-month",
            "bday-year",
            "sex",
            "tel",
            "tel-country-code",
            "tel-national",
            "tel-area-code",
            "tel-local",
            "tel-local-suffix",
            "tel-local-prefix",
            "tel-extension",
            "impp",
            "url",
            "photo",
            "webauthn",
          ],
        },
        maxLength: {
          type: "number",
          description:
            "The maximum number of characters supported by the input",
        },
        minLength: {
          type: "number",
          description:
            "The minimum number of characters supported by the input",
        },
        pattern: {
          type: "string",
          description:
            "Regex pattern that the value of the input must match to be valid",
          helpText:
            "For more information about writing Regular Expressions (regex), check out https://regexr.com/",
          validator: (value) => {
            try {
              new RegExp(value);
              return true;
            } catch (error) {
              return "Invalid Regex";
            }
          },
        },
        type: {
          type: "choice",
          defaultValueHint: "text",
          options: ["text", "search", "url", "tel", "email", "password"],
        },
        inputMode: {
          type: "choice",
          description:
            "hint to browsers as to the type of virtual keyboard configuration to use when editing this element or its contents.",
          options: [
            "none",
            "text",
            "tel",
            "url",
            "email",
            "numeric",
            "decimal",
            "search",
          ],
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
        onFocus: {
          type: "eventHandler",
          argTypes: [{ name: "focusEvent", type: "object" }],
        },
        onBlur: {
          type: "eventHandler",
          argTypes: [{ name: "focusEvent", type: "object" }],
        },
        onFocusChange: {
          type: "eventHandler",
          argTypes: [{ name: "isFocused", type: "boolean" }],
        },
        onKeyDown: {
          type: "eventHandler",
          argTypes: [{ name: "keyboardEvent", type: "object" }],
        },
        onKeyUp: {
          type: "eventHandler",
          argTypes: [{ name: "keyboardEvent", type: "object" }],
        },
        onCopy: {
          type: "eventHandler",
          argTypes: [{ name: "clipbordEvent", type: "object" }],
        },
        onCut: {
          type: "eventHandler",
          argTypes: [{ name: "clipbordEvent", type: "object" }],
        },
        onPaste: {
          type: "eventHandler",
          argTypes: [{ name: "clipbordEvent", type: "object" }],
        },
        onCompositionStart: {
          type: "eventHandler",
          argTypes: [{ name: "compositionEvent", type: "object" }],
        },
        onCompositionEnd: {
          type: "eventHandler",
          argTypes: [{ name: "compositionEvent", type: "object" }],
        },
        onCompositionUpdate: {
          type: "eventHandler",
          argTypes: [{ name: "compositionEvent", type: "object" }],
        },
        onSelect: {
          type: "eventHandler",
          argTypes: [{ name: "selectionEvent", type: "object" }],
        },
        onBeforeInput: {
          type: "eventHandler",
          argTypes: [{ name: "inputEvent", type: "object" }],
        },
        onInput: {
          type: "eventHandler",
          argTypes: [{ name: "inputEvent", type: "object" }],
        },
      },
      // NOTE: React-Aria does not support render props for <Input> and <Textarea>, so focusVisible and inputHovered states are not implemented
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

  const thisName = makeChildComponentName(
    overrides?.parentComponentName,
    TEXT_FIELD_COMPONENT_NAME
  );

  registerFieldError(loader, { parentComponentName: thisName });
  registerInput(loader, { parentComponentName: thisName });
  registerLabel(loader, { parentComponentName: thisName });
  registerTextArea(loader, { parentComponentName: thisName });
}
