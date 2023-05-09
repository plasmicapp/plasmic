import { Select } from "antd";
import React, { ComponentProps } from "react";
import {
  Registerable,
  registerComponentHelper,
  traverseReactEltTree,
} from "./utils";

export const AntdOption = Select.Option;
export const AntdOptionGroup = Select.OptGroup;

export function AntdSelect(
  props: ComponentProps<typeof Select> & {
    popupScopeClassName?: string;
    popupClassName?: string;
    defaultStylesClassName?: string;
    useChildren?: boolean;
  }
) {
  const {
    popupClassName,
    popupScopeClassName,
    defaultStylesClassName,
    suffixIcon,
    mode,
    useChildren,
    ...rest
  } = props;
  const curated = { ...rest };
  if (useChildren) {
    curated.options = undefined;
  }
  return (
    <Select
      {...curated}
      mode={!mode || (mode as any) === "single" ? undefined : mode}
      popupClassName={`${defaultStylesClassName} ${popupScopeClassName} ${popupClassName}`}
      {...(suffixIcon && { suffixIcon })}
    />
  );
}

export function registerSelect(loader?: Registerable) {
  registerComponentHelper(loader, AntdSelect, {
    name: "plasmic-antd5-select",
    displayName: "Select",
    props: {
      options: {
        type: "array",
        hidden: (ps) => !!ps.useChildren,
        itemType: {
          type: "object",
          nameFunc: (item: any) => item.label,
          fields: {
            value: "string",
            label: "string",
          },
        },
        defaultValue: [
          {
            value: "option1",
            label: "Option 1",
          },
          {
            value: "option2",
            label: "Option 2",
          },
        ],
      },

      useChildren: {
        displayName: "Use slot",
        type: "boolean",
        defaultValueHint: false,
        description:
          "Instead of configuring a list of options, customize the contents of the Select by dragging and dropping options in the outline/canvas, inside the 'children' slot. Lets you use any content or formatting within the Options, and also use Option Groups.",
      },

      children: {
        type: "slot",
        allowedComponents: [
          "plasmic-antd5-option",
          "plasmic-antd5-option-group",
        ],
        hidden: (ps) => !ps.useChildren,
      },

      placeholder: {
        type: "slot",
        defaultValue: "Select...",
      },
      suffixIcon: {
        type: "slot",
        hidePlaceholder: true,
      },
      open: {
        type: "boolean",
        editOnly: true,
        uncontrolledProp: "defaultOpen",
      },
      value: {
        type: "choice",
        displayName: "Selected value",
        editOnly: true,
        uncontrolledProp: "defaultValue",
        description: "Initial selected option",
        multiSelect: (ps: any) => ps.mode === "multiple",
        options: (ps: any) => {
          const options = new Set<string>();
          if (!ps.useChildren) {
            return (ps.options ?? []).map((o: any) => ({
              value: o.value || "",
              label: o.label ?? (o.value || ""),
            }));
          } else {
            traverseReactEltTree(ps.children, (elt) => {
              if (
                elt?.type === Select.Option &&
                typeof elt?.props?.value === "string"
              ) {
                options.add(elt.props.value);
              }
            });
          }
          return Array.from(options.keys());
        },
      },
      mode: {
        type: "choice",
        options: ["single", "multiple"],
        defaultValueHint: "single",
      },
      size: {
        type: "choice",
        options: ["small", "middle", "large"],
      },
      disabled: {
        type: "boolean",
        defaultValueHint: false,
      },
      showSearch: {
        type: "boolean",
        defaultValueHint: false,
        advanced: true,
      },
      status: {
        type: "choice",
        options: ["error", "warning"],
        advanced: true,
      },
      bordered: {
        type: "boolean",
        defaultValueHint: true,
      },
      autoFocus: {
        type: "boolean",
        displayName: "Focus automatically",
        defaultValueHint: false,
        advanced: true,
      },
      onChange: {
        type: "eventHandler",
        argTypes: [
          { name: "value", type: "string" },
          { name: "option", type: "object" },
        ],
      } as any,
      dropdownMatchSelectWidth: {
        type: "boolean",
        displayName: "Should dropdown match trigger button width?",
        defaultValueHint: true,
        advanced: true,
      },
      triggerClassName: {
        type: "class",
        displayName: "Trigger styles",
        noSelf: true,
        selectors: [
          {
            selector: ":component .ant-select-selector.ant-select-selector",
            label: "Base",
          },
          {
            selector: ":component .ant-select-selector:hover",
            label: "Hovered",
          },
        ],
        advanced: true,
      } as any,
      popupScopeClassName: {
        type: "styleScopeClass",
        scopeName: "popup",
      } as any,
      popupClassName: {
        type: "class",
        displayName: "Popup styles",
        selectors: [],
        advanced: true,
      } as any,
      optionClassName: {
        type: "class",
        displayName: "Option styles",
        noSelf: true,
        selectors: [
          {
            selector: ":popup.ant-select-dropdown .ant-select-item-option",
            label: "Base",
          },
          {
            selector:
              ":popup.ant-select-dropdown .ant-select-item-option-active",
            label: "Focused",
          },
          {
            selector:
              ":popup.ant-select-dropdown .ant-select-item-option-selected",
            label: "Selected",
          },
        ],
        advanced: true,
      } as any,
      placeholderClassName: {
        type: "class",
        displayName: "Placeholder styles",
        selectors: [
          {
            selector:
              ":component .ant-select-selector .ant-select-selection-placeholder",
            label: "Base",
          },
        ],
        advanced: true,
      } as any,
      defaultStylesClassName: {
        type: "themeResetClass",
      } as any,
      tagRender: {
        type: "slot",
        renderPropParams: ["tagProps"],
        hidePlaceholder: true,
      } as any,
    },
    states: {
      value: {
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChange",
        variableType: "text",
      },
    },
    ...({ trapsSelection: true } as any),
    importPath: "@plasmicpkgs/antd5/skinny/registerSelect",
    importName: "AntdSelect",
  });

  registerComponentHelper(loader, AntdOption, {
    name: "plasmic-antd5-option",
    displayName: "Option",
    parentComponentName: "plasmic-antd5-select",
    props: {
      children: {
        type: "slot",
        defaultValue: "Option",
        ...({ mergeWithParent: true } as any),
      },
      value: {
        type: "string",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerSelect",
    importName: "AntdOption",
  });

  registerComponentHelper(loader, AntdOptionGroup, {
    name: "plasmic-antd5-option-group",
    displayName: "Option Group",
    parentComponentName: "plasmic-antd5-select",
    props: {
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "component",
            name: "plasmic-antd5-option",
            props: {
              value: "option1",
              children: {
                type: "text",
                value: "Option 1",
              },
            },
          },
          {
            type: "component",
            name: "plasmic-antd5-option",
            props: {
              value: "option2",
              children: {
                type: "text",
                value: "Option 1",
              },
            },
          },
        ],
      },
      label: {
        type: "slot",
        defaultValue: "Group label",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerSelect",
    importName: "AntdOptionGroup",
  });
}
