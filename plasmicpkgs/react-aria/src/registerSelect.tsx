import React, { useCallback, useEffect, useMemo } from "react";
import {
  Select,
  SelectProps,
  SelectRenderProps,
  SelectStateContext,
  SelectValue,
} from "react-aria-components";
import { arrowDown, COMMON_STYLES, getCommonProps } from "./common";
import { OptionsItemIdManager } from "./OptionsItemIdManager";
import {
  PlasmicListBoxContext,
  PlasmicPopoverTriggerContext,
} from "./contexts";
import { BUTTON_COMPONENT_NAME } from "./registerButton";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import { LIST_BOX_COMPONENT_NAME } from "./registerListBox";
import { POPOVER_COMPONENT_NAME } from "./registerPopover";
import {
  HasControlContextData,
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
  useAutoOpen({
    props,
    open: () => {
      open?.();
      // using settimeout because the focus is not immediately available
      setTimeout(() => {
        /*
          When the select's popover is opened in the canvas, the listbox gains focus, trapping the keyboard focus within it. Pressing the up or down arrow keys navigates through the listbox items.
          However, there are three issues with this behavior:

            1. Focus should not be triggered in canvas (non-interactive mode)
            2. Canvas (non-interactive mode) should remain non-interactive: Navigation between listbox items or selection using the space key should not be possible.
            3. Keyboard hotkeys (e.g., backspace, undo) stop working: Key presses are absorbed by the listbox, breaking the expected behavior for shortcuts like backspace or undo (reference).

          To resolve this, we need to call document.activeElement.blur() to remove focus from the listbox.

          However, since the select component is a code component embedded within the artboard iframe, the keyboard hotkeys (e.g., backspace, undo) will not work,
          because they only function in the parent iframe (__wab_studio-frame).
          To ensure hotkeys work properly, we need to shift focus from the active element in the child iframe (artboard iframe) to the parent iframe (__wab_studio-frame) by using window.parent.
        */
        (window.parent.document.activeElement as HTMLElement)?.blur?.();
      }, 1);
    },
    close,
  });

  return null;
}

export interface BaseSelectValueProps
  extends React.ComponentProps<typeof SelectValue> {
  customize?: boolean;
}

export const BaseSelectValue = (props: BaseSelectValueProps) => {
  const { children, customize, className } = props;
  const placeholder = customize ? children : "Select an item";
  return (
    <SelectValue className={className} style={COMMON_STYLES}>
      {({ isPlaceholder, selectedText }) => (
        <>{isPlaceholder ? placeholder : selectedText}</>
      )}
    </SelectValue>
  );
};

const SELECT_NAME = makeComponentName("select");

export interface BaseSelectControlContextData {
  itemIds: string[];
}

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
    HasControlContextData<BaseSelectControlContextData> {
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
    "aria-label": ariaLabel,
  } = props;

  const idManager = useMemo(() => new OptionsItemIdManager(), []);

  useEffect(() => {
    idManager.subscribe((ids: string[]) => {
      setControlContextData?.({
        itemIds: ids,
      });
    });
  }, []);

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
      <SelectAutoOpen {...props} />
      <PlasmicPopoverTriggerContext.Provider value={true}>
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
      customize: {
        type: "boolean",
        displayName: "Customize placeholder",
        defaultValue: true,
        description: "Customize the placeholder text and styles",
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
        hidden: (props) => !props.customize,
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
