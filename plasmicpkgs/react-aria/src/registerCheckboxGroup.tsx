import React, { useCallback } from "react";
import type { CheckboxGroupProps } from "react-aria-components";
import { CheckboxGroup } from "react-aria-components";
import { COMMON_STYLES, getCommonProps } from "./common";
import { PlasmicCheckboxGroupContext } from "./contexts";
import { useIdManager } from "./OptionsItemIdManager";
import {
  CHECKBOX_COMPONENT_NAME,
  makeDefaultCheckboxChildren,
} from "./registerCheckbox";
import { DESCRIPTION_COMPONENT_NAME } from "./registerDescription";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import {
  BaseControlContextDataForLists,
  CodeComponentMetaOverrides,
  HasControlContextData,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";
import { pickAriaComponentVariants, WithVariants } from "./variant-utils";

const CHECKBOX_GROUP_VARIANTS = ["disabled" as const, "readonly" as const];

export interface BaseCheckboxGroupProps
  extends CheckboxGroupProps,
    HasControlContextData<BaseControlContextDataForLists>,
    WithVariants<typeof CHECKBOX_GROUP_VARIANTS> {
  children?: React.ReactNode;
}

const { variants, withObservedValues } = pickAriaComponentVariants(
  CHECKBOX_GROUP_VARIANTS
);

export function BaseCheckboxGroup(props: BaseCheckboxGroupProps) {
  const { children, plasmicUpdateVariant, setControlContextData, ...rest } =
    props;

  const updateIds = useCallback(
    (ids: string[]) => {
      setControlContextData?.({
        itemIds: ids,
      });
    },
    [setControlContextData]
  );

  const idManager = useIdManager(updateIds);
  return (
    // PlasmicCheckboxGroupContext is used by BaseCheckbox
    <PlasmicCheckboxGroupContext.Provider value={{ ...rest, idManager }}>
      <CheckboxGroup {...rest} style={COMMON_STYLES}>
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
      </CheckboxGroup>
    </PlasmicCheckboxGroupContext.Provider>
  );
}

const componentName = makeComponentName("checkboxGroup");

export function registerCheckboxGroup(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseCheckboxGroup>
) {
  registerComponentHelper(
    loader,
    BaseCheckboxGroup,
    {
      name: componentName,
      displayName: "Aria Checkbox Group",
      importPath: "@plasmicpkgs/react-aria/skinny/registerCheckboxGroup",
      importName: "BaseCheckboxGroup",
      variants,
      props: {
        ...getCommonProps<BaseCheckboxGroupProps>("checkbox group", [
          "name",
          "isDisabled",
          "isReadOnly",
          "aria-label",
          "isRequired",
        ]),
        children: {
          type: "slot",
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
                  name: CHECKBOX_COMPONENT_NAME,
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
                  name: CHECKBOX_COMPONENT_NAME,
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
                  name: CHECKBOX_COMPONENT_NAME,
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
                      value:
                        "Use the registered variants to see it in action...",
                    },
                  },
                },
              ],
            },
          ],
        },
        value: {
          type: "choice",
          editOnly: true,
          uncontrolledProp: "defaultValue",
          description: "The current value",
          options: (_props, ctx) =>
            ctx?.itemIds ? Array.from(ctx.itemIds) : [],
          multiSelect: true,
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
