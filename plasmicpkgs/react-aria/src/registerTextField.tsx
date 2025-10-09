import React, { ReactNode } from "react";
import type { InputProps, TextFieldProps } from "react-aria-components";
import { TextField } from "react-aria-components";
import {
  COMMON_STYLES,
  commonInputEventHandlerProps,
  createAriaLabelProp,
  createAutoCompleteProp,
  createAutoFocusProp,
  createDisabledProp,
  createIdProp,
  createInitialValueProp,
  createInputModeProp,
  createInputTypeProp,
  createMaxLengthProp,
  createMinLengthProp,
  createNameProp,
  createOnFocusChangeProp,
  createPatternProp,
  createReadOnlyProp,
  createRequiredProp,
  createValidationBehaviorProp,
  resolveAutoComplete,
} from "./common";
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
import {
  VariantUpdater,
  WithVariants,
  pickAriaComponentVariants,
} from "./variant-utils";

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

const { variants } = pickAriaComponentVariants(TEXT_FIELD_VARIANTS);

export function BaseTextField(props: BaseTextFieldProps) {
  const { children, plasmicUpdateVariant, autoComplete, ...rest } = props;

  const contextValue = React.useMemo(() => {
    return {
      isDisabled: props.isDisabled,
      isReadOnly: props.isReadOnly,
    };
  }, [props.isDisabled, props.isReadOnly]);

  return (
    // PlasmicTextFieldContext is used by
    // - BaseInput
    // - BaseTextArea
    <PlasmicTextFieldContext.Provider value={contextValue}>
      <TextField
        autoComplete={resolveAutoComplete(autoComplete)}
        {...rest}
        style={COMMON_STYLES}
      >
        {({ isDisabled, isReadOnly }) => (
          <>
            <VariantUpdater
              changes={{
                disabled: isDisabled,
                readonly: isReadOnly,
              }}
              updateVariant={plasmicUpdateVariant}
            />
            {children}
          </>
        )}
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
      props: {
        // Keep id first in the editor
        id: createIdProp("Text Field"),

        // Non-event props (explicit to preserve ordering)
        name: createNameProp(),
        value: createInitialValueProp("Text Field"),
        type: createInputTypeProp(),
        autoFocus: createAutoFocusProp("Text Field"),
        isDisabled: createDisabledProp("Text Field"),
        isReadOnly: createReadOnlyProp("Text Field"),
        isRequired: createRequiredProp("Text Field"),
        maxLength: createMaxLengthProp(),
        minLength: createMinLengthProp(),
        inputMode: createInputModeProp(),
        autoComplete: createAutoCompleteProp(),
        pattern: createPatternProp(),
        validationBehavior: createValidationBehaviorProp(),

        // Accessibility
        "aria-label": createAriaLabelProp("Text Field"),

        // Non-common event handler in Text Field only
        onFocusChange: createOnFocusChangeProp(),

        // Common event handlers appended last
        ...commonInputEventHandlerProps<BaseTextFieldProps>(),
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
