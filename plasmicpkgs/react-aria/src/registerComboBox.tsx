import React, { useCallback } from "react";
import {
  ComboBox,
  ComboBoxProps,
  ComboBoxRenderProps,
  ComboBoxStateContext,
} from "react-aria-components";
import {
  arrowDown,
  COMMON_STYLES,
  createAriaLabelProp,
  createDisabledProp,
  createIdProp,
  createNameProp,
} from "./common";
import {
  PlasmicInputContext,
  PlasmicListBoxContext,
  PlasmicPopoverTriggerContext,
} from "./contexts";
import { useIdManager } from "./OptionsItemIdManager";
import { BUTTON_COMPONENT_NAME } from "./registerButton";
import { INPUT_COMPONENT_NAME } from "./registerInput";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import { LIST_BOX_COMPONENT_NAME } from "./registerListBox";
import { POPOVER_COMPONENT_NAME } from "./registerPopover";
import {
  BaseControlContextDataForLists,
  HasControlContextData,
  makeComponentName,
  PlasmicCanvasProps,
  Registerable,
  registerComponentHelper,
  useAutoOpen,
} from "./utils";
import { pickAriaComponentVariants, WithVariants } from "./variant-utils";

const COMBOBOX_NAME = makeComponentName("combobox");

const COMBOBOX_VARIANTS = ["disabled" as const];

const { variants: COMBOBOX_VARIANTS_DATA } =
  pickAriaComponentVariants(COMBOBOX_VARIANTS);

export interface BaseComboboxProps
  extends ComboBoxProps<{}>,
    PlasmicCanvasProps,
    WithVariants<typeof COMBOBOX_VARIANTS>,
    HasControlContextData<BaseControlContextDataForLists> {
  children?: React.ReactNode;
  isOpen?: boolean;
  className?: string;
}

/*
  This React Hook is used to help with auto-opening the combobox when the canvas component is selected.
  Currently, there is a bug in react-aria combobox (https://github.com/adobe/react-spectrum/issues/7149) where, when the combobox's popover is auto-opened, it is unable to render any listbox items.
  Setting popover's open state to true in not enough unless, unless it has previously been opened via user interaction with combobox.
  Also, <Combobox> does not support an `isOpen` prop either.

  So, we use this custom hook to access the combobox's internal state via ComboBoxStateContext and change the `open` state manually via tha available `open` method.

  Note: It cannot be used as a hook like useAutoOpen() within the BaseSelect component
  because it needs access to SelectStateContext, which is only created in the BaseSelect component's render function.
  */
function ComboboxAutoOpen(props: PlasmicCanvasProps) {
  const { open, close } = React.useContext(ComboBoxStateContext) ?? {};

  useAutoOpen({ props, open, close });

  return null;
}

export function BaseComboBox(props: BaseComboboxProps) {
  const {
    children,
    setControlContextData,
    plasmicUpdateVariant,
    __plasmic_selection_prop__,
    plasmicNotifyAutoOpenedContent,
    className,
    isOpen: _isOpen, // uncontrolled if not selected in canvas/edit mode
    ...rest
  } = props;

  const classNameProp = useCallback(
    ({ isDisabled }: ComboBoxRenderProps) => {
      plasmicUpdateVariant?.({
        disabled: isDisabled,
      });
      return className ?? "";
    },
    [className, plasmicUpdateVariant]
  );

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
    <ComboBox className={classNameProp} {...rest} style={COMMON_STYLES}>
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
          {/* PlasmicInputContext is used by BaseInput */}
          <PlasmicInputContext.Provider value={{ isUncontrolled: true }}>
            <ComboboxAutoOpen
              __plasmic_selection_prop__={__plasmic_selection_prop__}
              plasmicNotifyAutoOpenedContent={plasmicNotifyAutoOpenedContent}
            />
            {children}
          </PlasmicInputContext.Provider>
        </PlasmicListBoxContext.Provider>
      </PlasmicPopoverTriggerContext.Provider>
    </ComboBox>
  );
}

export function registerComboBox(loader?: Registerable) {
  registerComponentHelper(loader, BaseComboBox, {
    name: COMBOBOX_NAME,
    displayName: "Aria ComboBox",
    importPath: "@plasmicpkgs/react-aria/skinny/registerComboBox",
    importName: "BaseComboBox",
    variants: COMBOBOX_VARIANTS_DATA,
    props: {
      id: createIdProp("ComboBox"),
      name: createNameProp(),
      isDisabled: createDisabledProp("ComboBox"),
      "aria-label": createAriaLabelProp("ComboBox"),
      selectedKey: {
        type: "choice",
        editOnly: true,
        uncontrolledProp: "defaultSelectedKey",
        displayName: "Initial selected item",
        options: (_props, ctx) => (ctx?.itemIds ? Array.from(ctx.itemIds) : []),
        // React Aria ComboBox do not support multiple selections yet
        multiSelect: false,
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
      onSelectionChange: {
        type: "eventHandler",
        argTypes: [{ name: "selectedValue", type: "string" }],
      },
      onOpenChange: {
        type: "eventHandler",
        argTypes: [{ name: "isOpen", type: "boolean" }],
      },

      children: {
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
                type: "hbox",
                styles: {
                  padding: 0,
                },
                children: [
                  {
                    type: "component",
                    name: INPUT_COMPONENT_NAME,
                    styles: {
                      width: "100%",
                      borderRightWidth: 0,
                    },
                  },
                  {
                    type: "component",
                    name: BUTTON_COMPONENT_NAME,
                    props: {
                      children: arrowDown,
                    },
                  },
                ],
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
                  offset: 0,
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
