import { usePlasmicCanvasContext } from "@plasmicapp/host";
import React from "react";
import { Key, Select, SelectValue } from "react-aria-components";
import { PlasmicListBoxContext } from "./contexts";
import {
  flattenOptions,
  HasOptions,
  makeOptionsPropType,
  makeValuePropType,
  useStrictOptions,
} from "./option-utils";
import { BUTTON_COMPONENT_NAME } from "./registerButton";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import { LIST_BOX_COMPONENT_NAME } from "./registerListBox";
import { POPOVER_COMPONENT_NAME } from "./registerPopover";
import {
  extractPlasmicDataProps,
  makeComponentName,
  Registerable,
  registerComponentHelper,
  Styleable,
} from "./utils";

export interface BaseSelectValueProps
  extends React.ComponentProps<typeof SelectValue> {
  customize?: boolean;
}

export const BaseSelectValue = (props: BaseSelectValueProps) => {
  const { children, customize } = props;
  return (
    <SelectValue>
      {({ isPlaceholder, selectedText }) => (
        <>
          {isPlaceholder ? (
            <span>Select an item</span>
          ) : (
            <>
              <span>
                {customize ? (children as React.ReactNode) : selectedText}
              </span>
            </>
          )}
          {}
        </>
      )}
    </SelectValue>
  );
};

const SELECT_NAME = makeComponentName("select");

export interface BaseSelectProps<T extends object>
  extends HasOptions<T>,
    Styleable {
  placeholder?: string;
  isDisabled?: boolean;

  value?: Key;
  onChange?: (value: Key) => void;

  previewOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  structure?: React.ReactNode;

  name?: string;
  "aria-label"?: string;

  renderOption?: (item: {
    value: string;
    label?: string;
    isDisabled?: boolean;
  }) => React.ReactNode;
}

export function BaseSelect<T extends object>(props: BaseSelectProps<T>) {
  const {
    value,
    onChange,
    placeholder,
    previewOpen,
    onOpenChange,
    isDisabled,
    className,
    style,
    structure,
    name,
    "aria-label": ariaLabel,
  } = props;

  const { options } = useStrictOptions(props);

  const isEditMode = !!usePlasmicCanvasContext();

  const disabledKeys = flattenOptions(options)
    .filter((op) => op.isDisabled)
    .map((op) => op.id);

  return (
    <Select
      placeholder={placeholder}
      selectedKey={value}
      onSelectionChange={onChange}
      onOpenChange={onOpenChange}
      isDisabled={isDisabled}
      className={className}
      style={style}
      name={name}
      aria-label={ariaLabel}
      {...(isEditMode ? { isOpen: previewOpen } : undefined)}
      {...extractPlasmicDataProps(props)}
    >
      <PlasmicListBoxContext.Provider
        value={{
          items: options,
          disabledKeys: disabledKeys,
        }}
      >
        {structure}
      </PlasmicListBoxContext.Provider>
    </Select>
  );
}

export function registerSelect(loader?: Registerable) {
  const selectValueMeta = registerComponentHelper(loader, BaseSelectValue, {
    name: makeComponentName("select-value"),
    displayName: "Aria Selected Value",
    importPath: "@plasmicpkgs/react-aria/skinny/registerSelect",
    importName: "BaseSelectValue",
    parentComponentName: SELECT_NAME,
    props: {
      customize: {
        type: "boolean",
        description: "Whether to customize the selected value display",
      },
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "text",
            value: "Selected value...",
          },
        ],
        hidden: (ps) => !ps.customize,
      },
      className: {
        type: "class",
        selectors: [
          {
            selector: ":self[data-placeholder]",
            label: "Placeholder",
          },
        ],
      },
    },
  });

  registerComponentHelper(loader, BaseSelect, {
    name: SELECT_NAME,
    displayName: "Aria Select",
    importPath: "@plasmicpkgs/react-aria/skinny/registerSelect",
    importName: "BaseSelect",
    props: {
      options: makeOptionsPropType(),
      placeholder: {
        type: "string",
      },
      isDisabled: {
        type: "boolean",
      },
      value: makeValuePropType(),
      onChange: {
        type: "eventHandler",
        argTypes: [{ name: "value", type: "string" }],
      },
      previewOpen: {
        type: "boolean",
        displayName: "Preview opened?",
        description: "Preview opened state while designing in Plasmic editor",
        editOnly: true,
      },
      onOpenChange: {
        type: "eventHandler",
        argTypes: [{ name: "isOpen", type: "boolean" }],
      },
      // optionValue: {
      //   type: "string",
      //   displayName: "Field key for an option's value",
      //   hidden: (ps) =>
      //     !ps.options ||
      //     !ps.options[0] ||
      //     typeof ps.options[0] === "string" ||
      //     "value" in ps.options[0],
      //   exprHint:
      //     "Return a function that takes in an option object, and returns the key to use",
      // },
      // optionText: {
      //   type: "string",
      //   displayName: "Field key for an option's text value",
      //   hidden: (ps) =>
      //     !ps.options ||
      //     !ps.options[0] ||
      //     typeof ps.options[0] === "string" ||
      //     "value" in ps.options[0],
      //   exprHint:
      //     "Return a function that takes in an option object, and returns the text value to use",
      // },
      // optionDisabled: {
      //   type: "string",
      //   displayName: "Field key for whether an option is disabled",
      //   hidden: (ps) =>
      //     !ps.options ||
      //     !ps.options[0] ||
      //     typeof ps.options[0] === "string" ||
      //     "value" in ps.options[0],
      //   exprHint:
      //     "Return a function that takes in an option object, and returns true if option should be disabled",
      // },

      structure: {
        type: "slot",
        defaultValue: [
          {
            type: "vbox",
            styles: {
              justifyContent: "flex-start",
              alignItems: "flex-start",
              width: "300px",
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
                name: BUTTON_COMPONENT_NAME,
                styles: {
                  width: "100%",
                },
                props: {
                  children: {
                    type: "hbox",
                    styles: {
                      width: "stretch",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "2px 5px",
                    },
                    children: [
                      {
                        type: "component",
                        name: selectValueMeta.name,
                      },
                      {
                        type: "img",
                        src: "https://static1.plasmic.app/arrow-up.svg",
                        styles: {
                          height: "20px",
                          width: "20px",
                          transform: "rotate(180deg)",
                        },
                      },
                    ],
                  },
                },
              },
              {
                type: "component",
                name: POPOVER_COMPONENT_NAME,
                styles: {
                  backgroundColor: "white",
                  padding: "10px",
                  overflow: "scroll",
                },
                props: {
                  children: [
                    {
                      type: "component",
                      name: LIST_BOX_COMPONENT_NAME,
                      styles: {
                        borderWidth: 0,
                        width: "stretch",
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },

      // renderOption: {
      //   type: "slot",
      //   displayName: "Custom render option",
      //   renderPropParams: ["item"],
      //   hidePlaceholder: true
      // },

      name: {
        type: "string",
        displayName: "Form field key",
        description: "Name of the input, when submitting in an HTML form",
        advanced: true,
      },

      "aria-label": {
        type: "string",
        displayName: "Aria Label",
        description: "Label for this input, if no visible label is used",
        advanced: true,
      },
    },
    states: {
      value: {
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChange",
        variableType: "text",
      },
      isOpen: {
        type: "readonly",
        onChangeProp: "onOpenChange",
        variableType: "boolean",
      },
    },
  });
}
