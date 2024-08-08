import { mergeProps } from "@react-aria/utils";
import React from "react";
import { ListBox } from "react-aria-components";
import { hasParent } from "./common";
import {
  PlasmicItemContext,
  PlasmicListBoxContext,
  PlasmicSectionContext,
} from "./contexts";
import {
  HasOptions,
  makeOptionsPropType,
  StrictOptionType,
  useStrictOptions,
} from "./option-utils";
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

export interface BaseListBoxProps
  extends React.ComponentProps<typeof ListBox>,
    HasOptions<any>,
    HasControlContextData {
  renderItem?: (item: any) => React.ReactNode;
  renderSection?: (section: any) => React.ReactNode;
  getItemType?: (thing: any) => "item" | "section";
}

export function BaseListBox(props: BaseListBoxProps) {
  const contextProps = React.useContext(PlasmicListBoxContext);
  const isStandalone: boolean = !contextProps;
  const { options: _rawOptions, setControlContextData, ...rest } = props;
  const { options } = useStrictOptions(props);
  const { renderItem, renderSection, ...mergedProps } = mergeProps(
    contextProps,
    rest,
    isStandalone ? { items: options } : {}
  );

  // Tell the prop control about whether the listbox is standalone or not, so it can hide/show the items prop
  setControlContextData?.({
    parent: isStandalone ? undefined : {},
  });

  return (
    <ListBox {...mergedProps}>
      {(item: StrictOptionType) => {
        if (item.type === "option-group") {
          return (
            <>
              <PlasmicSectionContext.Provider
                value={{
                  renderItem,
                  key: item.key ?? item.label,
                  section: item,
                }}
              >
                {renderSection?.(item)}
              </PlasmicSectionContext.Provider>
            </>
          );
        } else {
          return (
            <PlasmicItemContext.Provider value={item}>
              {renderItem?.(item)}
            </PlasmicItemContext.Provider>
          );
        }
      }}
    </ListBox>
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
        options: {
          ...makeOptionsPropType(),
          displayName: "Items",
          hidden: hasParent,
        },
        renderItem: {
          type: "slot",
          displayName: "Render Item",
          renderPropParams: ["itemProps"],
          defaultValue: {
            type: "component",
            name: listBoxItemMeta.name,
            props: {
              children: makeDefaultListBoxItemChildren(
                "Item (itemProps.label)",
                "Connect with `itemProps` in the data picker to display list box items"
              ),
            },
          },
        },
        renderSection: {
          type: "slot",
          displayName: "Render Section",
          renderPropParams: ["sectionProps"],
          defaultValue: {
            type: "component",
            name: sectionMeta.name,
            styles: {
              backgroundColor: "#F4FAFF",
            },
          },
        },
      },
    },
    overrides
  );
}
