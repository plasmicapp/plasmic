import React, { useMemo } from "react";
import { Key, ListBox } from "react-aria-components";
import { PlasmicListBoxContext } from "./contexts";
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

export interface BaseListBoxControlContextData {
  itemIds: string[];
}

export interface BaseListBoxProps
  extends Omit<
      React.ComponentProps<typeof ListBox>,
      "selectedKeys" | "defaultSelectedKeys"
    >,
    HasControlContextData<BaseListBoxControlContextData> {
  children?: React.ReactNode;
  selectedKeys?: string | string[] | undefined;
  defaultSelectedKeys?: string | string[] | undefined;
}

export const listboxHelpers = {
  states: {
    selectedKey: {
      onChangeArgsToValue: (value: Set<Key> | string[] | string) => {
        // only single selection is supported
        return Array.from(value)[0];
      },
    },
  },
};

export class ListBoxItemIdManager {
  private readonly ids: Set<string> = new Set();

  constructor(private readonly onIdsChanged: (ids: string[]) => void) {}

  private generateDuplicateId(id: string, count = 1): string {
    const dupId = `${id} duplicate(${count})`;
    if (this.ids.has(dupId)) {
      return this.generateDuplicateId(id, count + 1);
    } else {
      return dupId;
    }
  }

  private generateMissingId(count = 1): string {
    const missingId = `missing(${count})`;
    if (this.ids.has(missingId)) {
      return this.generateMissingId(count + 1);
    } else {
      return missingId;
    }
  }

  register(id?: string): string {
    let newId: string;
    if (!id) {
      // No id is provided, so generate one
      newId = this.generateMissingId();
    } else if (this.ids.has(id)) {
      // The provided id is already registered with another uuid (i.e. it's not unique), so just generate a new one
      newId = this.generateDuplicateId(id);
    } else {
      // The provided id is not already registered, so use it
      newId = id;
    }

    this.ids.add(newId);
    console.log("sarah", this.ids);
    this.onIdsChanged(Array.from(this.ids));
    return newId;
  }

  unregister(id: string) {
    this.ids.delete(id);
    this.onIdsChanged(Array.from(this.ids));
  }
}

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
    selectedKeys,
    defaultSelectedKeys,
    ...rest
  } = props;

  const idManager = useMemo(
    () =>
      new ListBoxItemIdManager((ids: string[]) => {
        setControlContextData?.({
          itemIds: ids,
        });
      }),
    []
  );

  return (
    <PlasmicListBoxContext.Provider
      value={{
        idManager,
      }}
    >
      <ListBox
        selectedKeys={normalizeSelectedKeys(selectedKeys)}
        defaultSelectedKeys={normalizeSelectedKeys(defaultSelectedKeys)}
        {...rest}
      >
        {children}
      </ListBox>
    </PlasmicListBoxContext.Provider>
  );
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
        },
        selectedKeys: {
          type: "choice",
          description: "The selected keys of the listbox",
          editOnly: true,
          uncontrolledProp: "defaultSelectedKeys",
          displayName: "Initial selected key",
          options: (
            _props: BaseListBoxProps,
            ctx: BaseListBoxControlContextData | null
          ) => (ctx?.itemIds ? Array.from(ctx.itemIds) : []),
          hidden: (props) => props.selectionMode === "none",
          // We do not support multiple selections yet (Because React Aria select and combobox only support single selections).
          multiSelect: false,
        },
        onSelectionChange: {
          type: "eventHandler",
          argTypes: [{ name: "itemIds", type: "object" }],
        },
      },
      states: {
        selectedKey: {
          type: "writable",
          valueProp: "selectedKeys",
          onChangeProp: "onSelectionChange",
          variableType: "text",
          ...listboxHelpers.states.selectedKey,
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
