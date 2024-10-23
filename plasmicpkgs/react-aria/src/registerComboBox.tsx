import {
  usePlasmicCanvasComponentInfo,
  usePlasmicCanvasContext,
} from "@plasmicapp/host";
import React, { useEffect, useMemo } from "react";
import {
  ComboBox,
  ComboBoxProps,
  ComboBoxStateContext,
} from "react-aria-components";
import { getCommonProps } from "./common";
import {
  PlasmicInputContext,
  PlasmicListBoxContext,
  PlasmicPopoverContext,
} from "./contexts";
import { ListBoxItemIdManager } from "./ListBoxItemIdManager";
import { BUTTON_COMPONENT_NAME } from "./registerButton";
import { INPUT_COMPONENT_NAME } from "./registerInput";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import { LIST_BOX_COMPONENT_NAME } from "./registerListBox";
import { POPOVER_COMPONENT_NAME } from "./registerPopover";
import {
  HasControlContextData,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

const COMBOBOX_NAME = makeComponentName("combobox");

export interface BaseComboboxControlContextData {
  itemIds: string[];
}

export interface BaseComboboxProps
  extends ComboBoxProps<{}>,
    HasControlContextData<BaseComboboxControlContextData> {
  placeholder?: string;
  children?: React.ReactNode;
  isOpen?: boolean;
}

/**
 * This React Hook is used to help with auto-opening the combobox when the canvas component is selected.
 * Currently, there is a bug in react-aria combobox (https://github.com/adobe/react-spectrum/issues/7149) where, when the combobox's popover is auto-opened, it is unable to render any listbox items.
 * Setting popover's open state to true in not enough unless, unless it has previously been opened via user interaction with combobox.
 * Also, <Combobox> does not support an `isOpen` prop either.
 *
 * So, we use this custom hook to access the combobox's internal state via ComboBoxStateContext and change the `open` state manually via tha available `open` method.
 *  */
function ComboboxAutoOpen(props: any) {
  const isEditMode = !!usePlasmicCanvasContext();
  const { isSelected } = usePlasmicCanvasComponentInfo(props) ?? {};
  const { open, close } = React.useContext(ComboBoxStateContext) ?? {};

  useEffect(() => {
    if (!isEditMode) {
      return;
    }
    if (isSelected) {
      open?.(undefined, "manual");
    } else {
      close?.();
    }
    // Not putting open and close in the useEffect dependencies array, because it causes a re-render loop.
  }, [isSelected, isEditMode]);

  return null;
}

export function BaseComboBox(props: BaseComboboxProps) {
  const { children, setControlContextData, isOpen, ...rest } = props;

  const idManager = useMemo(() => new ListBoxItemIdManager(), []);

  useEffect(() => {
    idManager.subscribe((ids: string[]) => {
      setControlContextData?.({
        itemIds: ids,
      });
    });
  }, []);

  return (
    <ComboBox {...rest}>
      <PlasmicPopoverContext.Provider
        value={{ isOpen, defaultShouldFlip: false }}
      >
        <PlasmicListBoxContext.Provider
          value={{
            idManager,
          }}
        >
          <PlasmicInputContext.Provider value={{ isUncontrolled: true }}>
            <ComboboxAutoOpen {...props} />
            {children}
          </PlasmicInputContext.Provider>
        </PlasmicListBoxContext.Provider>
      </PlasmicPopoverContext.Provider>
    </ComboBox>
  );
}

export function registerComboBox(loader?: Registerable) {
  registerComponentHelper(loader, BaseComboBox, {
    name: COMBOBOX_NAME,
    displayName: "Aria ComboBox",
    importPath: "@plasmicpkgs/react-aria/skinny/registerComboBox",
    importName: "BaseComboBox",
    props: {
      ...getCommonProps<BaseComboboxProps>("ComboBox", [
        "name",
        "aria-label",
        "placeholder",
        "isDisabled",
      ]),
      selectedKey: {
        type: "choice",
        description: "The selected keys of the listbox",
        editOnly: true,
        uncontrolledProp: "defaultSelectedKey",
        displayName: "Initial selected key",
        options: (_props, ctx) => (ctx?.itemIds ? Array.from(ctx.itemIds) : []),
        // React Aria ComboBox do not support multiple comboBoxions yet
        multiSelect: false,
      },
      disabledKeys: {
        type: "choice",
        description:
          "The item keys that are disabled. These items cannot be selected, focused, or otherwise interacted with.",
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
        argTypes: [{ name: "selectedKey", type: "string" }],
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
                children: [
                  {
                    type: "component",
                    name: INPUT_COMPONENT_NAME,
                    styles: {
                      width: "100%",
                    },
                  },
                  {
                    type: "component",
                    name: BUTTON_COMPONENT_NAME,
                    props: {
                      children: {
                        type: "img",
                        // TODO: Replace with the image of an arrow pointing up, like: https://icon-sets.iconify.design/mdi/triangle/
                        src: "https://static1.plasmic.app/arrow-up.svg",
                        styles: {
                          width: "15px",
                          transform: "rotate(180deg)",
                        },
                      },
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
      selectedKey: {
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
