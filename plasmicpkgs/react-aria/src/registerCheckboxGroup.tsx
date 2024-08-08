import React from "react";
import type { CheckboxGroupProps } from "react-aria-components";
import { CheckboxGroup } from "react-aria-components";
import { getCommonProps } from "./common";
import { PlasmicCheckboxGroupContext } from "./contexts";
import {
  pickAriaComponentVariants,
  UpdateInteractionVariant,
} from "./interaction-variant-utils";
import {
  makeDefaultCheckboxChildren,
  registerCheckbox,
} from "./registerCheckbox";
import { DESCRIPTION_COMPONENT_NAME } from "./registerDescription";
import { registerFieldError } from "./registerFieldError";
import { LABEL_COMPONENT_NAME, registerLabel } from "./registerLabel";
import {
  CodeComponentMetaOverrides,
  makeChildComponentName,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

const CHECKBOX_GROUP_INTERACTION_VARIANTS = [
  "disabled" as const,
  "readonly" as const,
];

export interface BaseCheckboxGroupProps extends CheckboxGroupProps {
  children?: React.ReactNode;
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof CHECKBOX_GROUP_INTERACTION_VARIANTS
  >;
}

const { interactionVariants, withObservedValues } = pickAriaComponentVariants(
  CHECKBOX_GROUP_INTERACTION_VARIANTS
);

export function BaseCheckboxGroup(props: BaseCheckboxGroupProps) {
  const { children, updateInteractionVariant, ...rest } = props;

  return (
    <PlasmicCheckboxGroupContext.Provider value={rest}>
      <CheckboxGroup {...rest}>
        {({ isDisabled, isReadOnly }) =>
          withObservedValues(
            children,
            {
              disabled: isDisabled,
              readonly: isReadOnly,
            },
            updateInteractionVariant
          )
        }
      </CheckboxGroup>
    </PlasmicCheckboxGroupContext.Provider>
  );
}

const componentName = makeComponentName("checkboxGroup");

export function registerCheckboxGroup(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseCheckboxGroup>
) {
  const thisName = makeChildComponentName(
    overrides?.parentComponentName,
    componentName
  );

  registerFieldError(loader, { parentComponentName: thisName });
  const checkboxMeta = registerCheckbox(loader, {
    parentComponentName: thisName,
  });
  registerLabel(loader, { parentComponentName: thisName });

  registerComponentHelper(
    loader,
    BaseCheckboxGroup,
    {
      name: componentName,
      displayName: "Aria Checkbox Group",
      importPath: "@plasmicpkgs/react-aria/skinny/registerCheckboxGroup",
      importName: "BaseCheckboxGroup",
      interactionVariants,
      props: {
        ...getCommonProps<BaseCheckboxGroupProps>("checkbox group", [
          "name",
          "isDisabled",
          "isReadOnly",
          "aria-label",
          "children",
          "isRequired",
        ]),
        children: {
          type: "slot",
          mergeWithParent: true as any,
          defaultValue: [
            {
              type: "vbox",
              styles: {
                display: "flex",
                gap: "5px",
                padding: 0,
                alignItems: "flex-start",
              },
              children: [
                {
                  type: "component",
                  name: LABEL_COMPONENT_NAME,
                  props: {
                    children: {
                      type: "text",
                      value: "Checkbox Group",
                    },
                  },
                },
                {
                  type: "component",
                  name: checkboxMeta.name,
                  props: {
                    children: makeDefaultCheckboxChildren({
                      label: "Checkbox 1",
                      showDocs: false,
                    }),
                    value: "checkbox1",
                  },
                },
                {
                  type: "component",
                  name: checkboxMeta.name,
                  props: {
                    children: makeDefaultCheckboxChildren({
                      label: "Checkbox 2",
                      showDocs: false,
                    }),
                    value: "checkbox2",
                  },
                },
                {
                  type: "component",
                  name: checkboxMeta.name,
                  props: {
                    children: makeDefaultCheckboxChildren({
                      label: "Checkbox 3",
                      showDocs: false,
                    }),
                    value: "checkbox3",
                  },
                },
                {
                  type: "component",
                  name: DESCRIPTION_COMPONENT_NAME,
                  props: {
                    children: {
                      type: "text",
                      value: "Add interaction variants to see it in action...",
                    },
                  },
                },
              ],
            },
          ],
        },
        value: {
          type: "array",
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
          argTypes: [{ name: "value", type: "object" }],
        },
      },
      states: {
        value: {
          type: "writable",
          valueProp: "value",
          onChangeProp: "onChange",
          variableType: "array",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
