import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Key, ListBox, ListBoxRenderProps } from "react-aria-components";
import { COMMON_STYLES } from "./common";
import { PlasmicListBoxContext } from "./contexts";
import { OptionsItemIdManager } from "./OptionsItemIdManager";
import {
  makeDefaultListBoxItemChildren,
  registerListBoxItem,
} from "./registerListBoxItem";
import { registerSection } from "./registerSection";
import {
  CodeComponentMetaOverrides,
  HasControlContextData,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";
import { pickAriaComponentVariants, WithVariants } from "./variant-utils";

export interface BaseListBoxControlContextData {
  itemIds: string[];
  isStandalone: boolean;
}

const LISTBOX_VARIANTS = ["focused" as const, "focusVisible" as const];

const { variants } = pickAriaComponentVariants(LISTBOX_VARIANTS);

export interface BaseListBoxProps
  extends Omit<
      React.ComponentProps<typeof ListBox>,
      "selectedKeys" | "defaultSelectedKeys" | "className"
    >,
    HasControlContextData<BaseListBoxControlContextData>,
    WithVariants<typeof LISTBOX_VARIANTS> {
  children?: React.ReactNode;
  selectedKeys?: string | string[] | undefined;
  defaultSelectedKeys?: string | string[] | undefined;
  className?: string;
}

export const listboxHelpers = {
  states: {
    selectedValue: {
      onChangeArgsToValue: (value: Set<Key> | string[] | string) => {
        // only single selection is supported
        return Array.from(value)[0];
      },
    },
  },
};

function normalizeSelectedKeys(selectedKeys: string | string[] | undefined) {
  // Listbox expects it to be of type "all" | Iterable
  return typeof selectedKeys === "string" && selectedKeys !== "all"
    ? [selectedKeys]
    : selectedKeys;
}

export function BaseListBox(props: BaseListBoxProps) {
  const {
    setControlContextData: setControlContextData,
    children,
    className,
    selectedKeys,
    defaultSelectedKeys,
    plasmicUpdateVariant,
    ...rest
  } = props;
  const context = React.useContext(PlasmicListBoxContext);
  const isStandalone = !context;
  const [ids, setIds] = useState<string[]>([]);
  const idManager = useMemo(
    () => context?.idManager ?? new OptionsItemIdManager(),
    []
  );

  useEffect(() => {
    setControlContextData?.({
      itemIds: ids,
      isStandalone,
    });
  }, [ids, isStandalone, setControlContextData]);

  useEffect(() => {
    idManager.subscribe((_ids: string[]) => {
      setIds(_ids);
    });
  }, []);

  const classNameProp = useCallback(
    ({ isFocusVisible, isFocused }: ListBoxRenderProps) => {
      plasmicUpdateVariant?.({
        focused: isFocused,
        focusVisible: isFocusVisible,
      });
      return className ?? "";
    },
    [className, plasmicUpdateVariant]
  );

  const listbox = (
    <ListBox
      selectedKeys={normalizeSelectedKeys(selectedKeys)}
      defaultSelectedKeys={normalizeSelectedKeys(defaultSelectedKeys)}
      className={classNameProp}
      style={COMMON_STYLES}
      {...rest}
    >
      {children}
    </ListBox>
  );

  if (isStandalone) {
    return (
      <PlasmicListBoxContext.Provider
        value={{
          idManager,
        }}
      >
        {listbox}
      </PlasmicListBoxContext.Provider>
    );
  }

  return listbox;
}

export const LIST_BOX_COMPONENT_NAME = makeComponentName("listbox");

export function registerListBox(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseListBox>
) {
  const listBoxItemMeta = registerListBoxItem(loader, {
    parentComponentName: LIST_BOX_COMPONENT_NAME,
  });
  const sectionMeta = registerSection(loader, {
    parentComponentName: LIST_BOX_COMPONENT_NAME,
    props: {
      items: {
        type: "slot",
        defaultValue: [
          {
            type: "component",
            name: listBoxItemMeta.name,
            props: {
              id: "section-1-1",
              textValue: "Section1-Item 1",
              children: [
                makeDefaultListBoxItemChildren(
                  "Item 1",
                  "Add dynamic values to make it more interesting"
                ),
              ],
            },
          },
          {
            type: "component",
            name: listBoxItemMeta.name,
            props: {
              id: "section-1-2",
              textValue: "Section1-Item 2",
              children: [
                makeDefaultListBoxItemChildren(
                  "Item 2",
                  "Add dynamic values to make it more interesting"
                ),
              ],
            },
          },
          {
            type: "component",
            name: listBoxItemMeta.name,
            props: {
              id: "section-1-3",
              textValue: "Section1-Item 3",
              children: [
                makeDefaultListBoxItemChildren(
                  "Item 3",
                  "Add dynamic values to make it more interesting"
                ),
              ],
            },
          },
        ],
      },
    },
  });

  registerComponentHelper(
    loader,
    BaseListBox,
    {
      name: LIST_BOX_COMPONENT_NAME,
      displayName: "Aria ListBox",
      importPath: "@plasmicpkgs/react-aria/skinny/registerListBox",
      importName: "BaseListBox",
      variants,
      defaultStyles: {
        width: "250px",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "black",
      },
      props: {
        children: {
          type: "slot",
          displayName: "List Items",
          allowedComponents: [listBoxItemMeta.name, sectionMeta.name],
          allowRootWrapper: true,
          defaultValue: [
            {
              type: "component",
              name: listBoxItemMeta.name,
              props: {
                id: "1",
                textValue: "Item 1",
                children: [
                  makeDefaultListBoxItemChildren(
                    "Item 1",
                    "Add dynamic values to make it more interesting"
                  ),
                ],
              },
            },
            {
              type: "component",
              name: listBoxItemMeta.name,
              props: {
                id: "2",
                textValue: "Item 2",
                children: [
                  makeDefaultListBoxItemChildren(
                    "Item 2",
                    "Add dynamic values to make it more interesting"
                  ),
                ],
              },
            },
            {
              type: "component",
              name: listBoxItemMeta.name,
              props: {
                id: "3",
                textValue: "Item 3",
                children: [
                  makeDefaultListBoxItemChildren(
                    "Item 3",
                    "Add dynamic values to make it more interesting"
                  ),
                ],
              },
            },
            {
              type: "component",
              name: sectionMeta.name,
            },
          ],
        },
        selectionMode: {
          type: "choice",
          description: "The selection mode of the listbox",
          options: ["none", "single"],
          defaultValue: "none",
          hidden: (_props, ctx) => !ctx?.isStandalone,
        },
        selectedKeys: {
          type: "choice",
          editOnly: true,
          uncontrolledProp: "defaultSelectedKeys",
          displayName: "Initial selected item",
          options: (_props, ctx) =>
            ctx?.itemIds ? Array.from(ctx.itemIds) : [],
          hidden: (props, ctx) =>
            !ctx?.isStandalone || props.selectionMode === "none",
          // We do not support multiple selections yet (Because React Aria select and combobox only support single selections).
          multiSelect: false,
        },
        onSelectionChange: {
          type: "eventHandler",
          argTypes: [{ name: "selectedValues", type: "object" }],
        },
      },
      states: {
        selectedValue: {
          type: "writable",
          valueProp: "selectedKeys",
          hidden: (props, ctx) =>
            !ctx?.isStandalone || props.selectionMode === "none",
          onChangeProp: "onSelectionChange",
          variableType: "text",
          ...listboxHelpers.states.selectedValue,
        },
      },
      componentHelpers: {
        helpers: listboxHelpers,
        importName: "listboxHelpers",
        importPath: "@plasmicpkgs/react-aria/skinny/registerListBox",
      },
      trapsFocus: true,
    },
    overrides
  );
}
