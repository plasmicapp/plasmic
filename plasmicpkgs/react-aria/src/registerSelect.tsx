import React, { useCallback } from "react";
import {
  Select,
  SelectProps,
  SelectRenderProps,
  SelectStateContext,
  SelectValue,
} from "react-aria-components";
import { COMMON_STYLES, arrowDown, getCommonProps } from "./common";
import {
  PlasmicListBoxContext,
  PlasmicPopoverTriggerContext,
} from "./contexts";
import { useIdManager } from "./OptionsItemIdManager";
import { BUTTON_COMPONENT_NAME } from "./registerButton";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import { LIST_BOX_COMPONENT_NAME } from "./registerListBox";
import { POPOVER_COMPONENT_NAME } from "./registerPopover";
import {
  BaseControlContextDataForLists,
  HasControlContextData,
  PlasmicCanvasProps,
  Registerable,
  extractPlasmicDataProps,
  makeComponentName,
  registerComponentHelper,
  useAutoOpen,
} from "./utils";
import { WithVariants, pickAriaComponentVariants } from "./variant-utils";

// It cannot be used as a hook like useAutoOpen() within the BaseSelect component
// because it needs access to SelectStateContext, which is only created in the BaseSelect component's render function.
function SelectAutoOpen(props: any) {
  const { open, close } = React.useContext(SelectStateContext) ?? {};
  useAutoOpen({ props, open, close });
  return null;
}

export interface BaseSelectValueProps
  extends React.ComponentProps<typeof SelectValue> {
  children: React.ReactNode;
}

export const BaseSelectValue = (props: BaseSelectValueProps) => {
  const { children: placeholder, className } = props;
  return (
    <SelectValue className={className} style={COMMON_STYLES}>
      {({ isPlaceholder, selectedText }) => (
        <>{isPlaceholder ? placeholder : selectedText}</>
      )}
    </SelectValue>
  );
};

const SELECT_NAME = makeComponentName("select");

const SELECT_VARIANTS = [
  "focused" as const,
  "focusVisible" as const,
  "disabled" as const,
];

const { variants: SELECT_VARIANTS_DATA } =
  pickAriaComponentVariants(SELECT_VARIANTS);

export interface BaseSelectProps
  extends SelectProps<{}>, // NOTE: We don't need generic type here since we don't use items prop (that needs it). We just need to make the type checker happy
    WithVariants<typeof SELECT_VARIANTS>,
    PlasmicCanvasProps,
    HasControlContextData<BaseControlContextDataForLists> {
  children?: React.ReactNode;
  className?: string;
}

export function BaseSelect(props: BaseSelectProps) {
  const {
    selectedKey,
    onSelectionChange,
    onOpenChange,
    isDisabled,
    className,
    children,
    disabledKeys,
    name,
    setControlContextData,
    plasmicUpdateVariant,
    plasmicNotifyAutoOpenedContent,
    __plasmic_selection_prop__,
    defaultSelectedKey,
    "aria-label": ariaLabel,
  } = props;

  const updateIds = useCallback(
    (ids: string[]) => {
      setControlContextData?.({
        itemIds: ids,
      });
    },
    [setControlContextData]
  );

  const idManager = useIdManager(updateIds);

  const classNameProp = useCallback(
    ({
      isDisabled: isDisabled2,
      isFocusVisible,
      isFocused,
    }: SelectRenderProps) => {
      plasmicUpdateVariant?.({
        disabled: isDisabled2,
        focused: isFocused,
        focusVisible: isFocusVisible,
      });
      return className ?? "";
    },
    [className, plasmicUpdateVariant]
  );

  return (
    <Select
      defaultSelectedKey={defaultSelectedKey}
      selectedKey={selectedKey}
      onSelectionChange={onSelectionChange}
      onOpenChange={onOpenChange}
      isDisabled={isDisabled}
      className={classNameProp}
      style={COMMON_STYLES}
      name={name}
      disabledKeys={disabledKeys}
      aria-label={ariaLabel}
      {...extractPlasmicDataProps(props)}
    >
      <SelectAutoOpen
        __plasmic_selection_prop__={__plasmic_selection_prop__}
        plasmicNotifyAutoOpenedContent={plasmicNotifyAutoOpenedContent}
      />
      {/* PlasmicPopoverTriggerContext is used by BasePopover */}
      <PlasmicPopoverTriggerContext.Provider value={true}>
        {/* PlasmicListBoxContext is used by
          - BaseListBox
          - BaseListBoxItem
          - BaseSection
        */}
        <PlasmicListBoxContext.Provider
          value={{
            idManager,
          }}
        >
          {children}
        </PlasmicListBoxContext.Provider>
      </PlasmicPopoverTriggerContext.Provider>
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
      /** @deprecated use children (Placeholder) directly */
      customize: {
        type: "boolean",
        displayName: "Customize placeholder",
        defaultValue: true,
        description: "Customize the placeholder text and styles",
        /** Obsolete, but retained (permanently hidden) for backward compatibility.  */
        hidden: () => true,
      },
      children: {
        type: "slot",
        displayName: "Placeholder",
        defaultValue: [
          {
            type: "text",
            value: "Select an item",
          },
        ],
      },
    },
    trapsFocus: true,
  });

  registerComponentHelper(loader, BaseSelect, {
    name: SELECT_NAME,
    displayName: "Aria Select",
    importPath: "@plasmicpkgs/react-aria/skinny/registerSelect",
    importName: "BaseSelect",
    variants: SELECT_VARIANTS_DATA,
    props: {
      ...getCommonProps<BaseSelectProps>("Select", [
        "name",
        "aria-label",
        "isDisabled",
        "autoFocus",
      ]),
      selectedKey: {
        type: "choice",
        editOnly: true,
        uncontrolledProp: "defaultSelectedKey",
        displayName: "Initial selected item",
        options: (_props, ctx) => (ctx?.itemIds ? Array.from(ctx.itemIds) : []),
        // React Aria Select do not support multiple selections yet
        multiSelect: false,
      },
      onSelectionChange: {
        type: "eventHandler",
        argTypes: [{ name: "selectedValue", type: "string" }],
      },
      disabledKeys: {
        type: "choice",
        displayName: "Disabled values",
        description:
          "The items that are disabled. These items cannot be selected, focused, or otherwise interacted with.",
        options: (_props, ctx) => (ctx?.itemIds ? Array.from(ctx.itemIds) : []),
        multiSelect: true,
        advanced: true,
      },
      isOpen: {
        type: "boolean",
        defaultValue: false,
        // It doesn't make sense to make isOpen prop editable (it's controlled by user interaction and always closed by default), so we keep this prop hidden. We have listed the prop here in the meta only so we can expose a writeable state for it.
        hidden: () => true,
      },
      onOpenChange: {
        type: "eventHandler",
        argTypes: [{ name: "isOpen", type: "boolean" }],
      },
      children: {
        type: "slot",
        mergeWithParent: true,
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
                  padding: "4px 10px",
                  background: "white",
                },
                props: {
                  children: {
                    type: "hbox",
                    styles: {
                      width: "stretch",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 0,
                    },
                    children: [
                      {
                        type: "component",
                        name: selectValueMeta.name,
                      },
                      arrowDown,
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
                  width: "unset",
                },
                props: {
                  children: [
                    {
                      type: "component",
                      name: LIST_BOX_COMPONENT_NAME,
                      props: {
                        selectionMode: "single",
                      },
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
    },
    states: {
      selectedValue: {
        type: "writable",
        valueProp: "selectedKey",
        onChangeProp: "onSelectionChange",
        variableType: "text",
      },
      isOpen: {
        type: "writable",
        valueProp: "isOpen",
        onChangeProp: "onOpenChange",
        variableType: "boolean",
      },
    },
    trapsFocus: true,
  });
}
