import { PlasmicElement } from "@plasmicapp/host";
import React, { useEffect, useState } from "react";
import type { CheckboxProps } from "react-aria-components";
import { Checkbox } from "react-aria-components";
import { COMMON_STYLES, getCommonProps, hasParent } from "./common";
import { PlasmicCheckboxGroupContext } from "./contexts";
import {
  BaseControlContextData,
  CodeComponentMetaOverrides,
  HasControlContextData,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";
import { WithVariants, pickAriaComponentVariants } from "./variant-utils";

const CHECKBOX_VARIANTS = [
  "hovered" as const,
  "pressed" as const,
  "focused" as const,
  "focusVisible" as const,
  "indeterminate" as const,
  "disabled" as const,
  "selected" as const,
  "readonly" as const,
  "selected" as const,
];

export interface BaseCheckboxControlContextData extends BaseControlContextData {
  idError?: string;
}

interface BaseCheckboxProps
  extends CheckboxProps,
    HasControlContextData<BaseCheckboxControlContextData>,
    WithVariants<typeof CHECKBOX_VARIANTS> {
  children: React.ReactNode;
}

const { variants, withObservedValues } =
  pickAriaComponentVariants(CHECKBOX_VARIANTS);

export function BaseCheckbox(props: BaseCheckboxProps) {
  const {
    children,
    plasmicUpdateVariant,
    setControlContextData,
    value,
    ...rest
  } = props;
  const contextProps = React.useContext(PlasmicCheckboxGroupContext);
  const isStandalone = !contextProps;

  const [registeredId, setRegisteredId] = useState<string | undefined>();

  useEffect(() => {
    if (!contextProps?.idManager) {
      return;
    }

    const localId = contextProps.idManager.register(value);
    setRegisteredId(localId);

    return () => {
      contextProps.idManager.unregister(localId);
      setRegisteredId(undefined);
    };
  }, [value, contextProps?.idManager]);

  setControlContextData?.({
    parent: contextProps,
    idError: (() => {
      if (value === undefined) {
        return "Value must be defined";
      }
      if (typeof value !== "string") {
        return "Value must be a string";
      }
      if (!value.trim()) {
        return "Value must be defined";
      }
      if (!isStandalone && value != registeredId) {
        return "Value must be unique";
      }
      return undefined;
    })(),
  });

  return (
    <>
      <Checkbox
        {...rest}
        value={registeredId}
        key={registeredId}
        style={COMMON_STYLES}
      >
        {({
          isHovered,
          isPressed,
          isFocused,
          isFocusVisible,
          isDisabled,
          isIndeterminate,
          isSelected,
          isReadOnly,
        }) =>
          withObservedValues(
            children,
            {
              hovered: isHovered,
              pressed: isPressed,
              focused: isFocused,
              focusVisible: isFocusVisible,
              disabled: isDisabled,
              indeterminate: isIndeterminate,
              selected: isSelected,
              readonly: isReadOnly,
            },
            plasmicUpdateVariant
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
          type: "text",
          value: label,
        },
      ],
    },
    ...(showDocs
      ? [
          {
            type: "text",
            value: "Use the registered variants to see it in action...",
          } as PlasmicElement,
        ]
      : []),
  ],
});

export const CHECKBOX_COMPONENT_NAME = makeComponentName("checkbox");

export function registerCheckbox(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseCheckbox>
) {
  return registerComponentHelper(
    loader,
    BaseCheckbox,
    {
      name: CHECKBOX_COMPONENT_NAME,
      displayName: "Aria Checkbox",
      importPath: "@plasmicpkgs/react-aria/skinny/registerCheckbox",
      importName: "BaseCheckbox",
      variants,
      props: {
        ...getCommonProps<BaseCheckboxProps>("checkbox", [
          "name",
          "isDisabled",
          "isReadOnly",
          "aria-label",
          "isRequired",
          "autoFocus",
        ]),
        children: {
          type: "slot",
          mergeWithParent: true,
          defaultValue: makeDefaultCheckboxChildren({
            label: "Label",
            showDocs: true,
          }),
        },
        value: {
          type: "string",
          description:
            'The value of the checkbox in "selected" state, used when submitting an HTML form.',
          defaultValueHint: "on",
          validator: (_value, _props, ctx) => {
            if (ctx?.idError) {
              return ctx.idError;
            }
            return true;
          },
        },
        isSelected: {
          type: "boolean",
          displayName: "Default Selected",
          editOnly: true,
          uncontrolledProp: "defaultSelected",
          description: "Whether the checkbox should be selected by default",
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
          hidden: hasParent,
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
