import { PlasmicElement } from "@plasmicapp/host";
import React from "react";
import type { CheckboxProps } from "react-aria-components";
import { Checkbox } from "react-aria-components";
import { getCommonInputProps } from "./common";
import { PlasmicCheckboxGroupContext } from "./contexts";
import {
  UpdateInteractionVariant,
  pickAriaComponentVariants,
} from "./interaction-variant-utils";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import {
  BaseControlContextData,
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";

const CHECKBOX_INTERACTION_VARIANTS = [
  "hovered" as const,
  "pressed" as const,
  "focused" as const,
  "focusVisible" as const,
];

interface BaseCheckboxProps extends CheckboxProps {
  children: React.ReactNode;
  setControlContextData?: (ctxData: BaseControlContextData) => void;
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof CHECKBOX_INTERACTION_VARIANTS
  >;
}

const { interactionVariants, withObservedValues } = pickAriaComponentVariants(
  CHECKBOX_INTERACTION_VARIANTS
);

export function BaseCheckbox(props: BaseCheckboxProps) {
  const { children, updateInteractionVariant, setControlContextData, ...rest } =
    props;
  const contextProps = React.useContext(PlasmicCheckboxGroupContext);
  const isStandalone = !contextProps;

  setControlContextData?.({
    isStandalone,
  });

  return (
    <>
      <Checkbox {...rest}>
        {({ isHovered, isPressed, isFocused, isFocusVisible }) =>
          withObservedValues(
            children,
            {
              hovered: isHovered,
              pressed: isPressed,
              focused: isFocused,
              focusVisible: isFocusVisible,
            },
            updateInteractionVariant
          )
        }
      </Checkbox>
    </>
  );
}

export const makeDefaultCheckboxChildren = ({
  label,
  showDocs,
}: {
  label: string;
  showDocs?: boolean;
}): PlasmicElement => ({
  type: "vbox",
  styles: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    padding: 0,
  },
  children: [
    {
      type: "hbox",
      styles: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: 0,
      },
      children: [
        {
          type: "box",
          styles: {
            width: "7px",
            height: "7px",
            borderRadius: "3px",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "black",
          },
        },
        {
          type: "component",
          name: LABEL_COMPONENT_NAME,
          props: {
            children: {
              type: "text",
              value: label,
            },
          },
        },
      ],
    },
    ...(showDocs
      ? [
          {
            type: "text",
            value: "Add interaction variants to see it in action...",
          } as PlasmicElement,
        ]
      : []),
  ],
});

export function registerCheckbox(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseCheckbox>
) {
  return registerComponentHelper(
    loader,
    BaseCheckbox,
    {
      name: makeComponentName("checkbox"),
      displayName: "Aria Checkbox",
      importPath: "@plasmicpkgs/react-aria/skinny/registerCheckbox",
      importName: "BaseCheckbox",
      interactionVariants,
      props: {
        ...getCommonInputProps<CheckboxProps>("checkbox", [
          "name",
          "isDisabled",
          "isReadOnly",
          "aria-label",
          "isRequired",
          "autoFocus",
        ]),
        children: {
          type: "slot",
          mergeWithParent: true as any,
          defaultValue: makeDefaultCheckboxChildren({
            label: "Label",
            showDocs: true,
          }),
        },
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
          defaultValue: false,
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
      },
      states: {
        isSelected: {
          type: "writable",
          valueProp: "isSelected",
          onChangeProp: "onChange",
          variableType: "boolean",
          hidden: (
            _ps: BaseCheckboxProps,
            ctx: BaseControlContextData | null
          ) => !ctx?.isStandalone,
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
