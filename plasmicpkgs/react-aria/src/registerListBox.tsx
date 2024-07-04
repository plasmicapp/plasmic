import { mergeProps } from "@react-aria/utils";
import React from "react";
import { ListBox } from "react-aria-components";
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
import { registerListBoxItem } from "./registerListBoxItem";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

interface BaseListBoxControlContextData {
  isStandalone: boolean;
}

export interface BaseListBoxProps
  extends React.ComponentProps<typeof ListBox>,
    HasOptions<any> {
  renderItem?: (item: any) => React.ReactNode;
  renderSection?: (section: any) => React.ReactNode;
  getItemType?: (thing: any) => "item" | "section";
  setControlContextData?: (ctxData: BaseListBoxControlContextData) => void;
}

export function BaseListBox(props: BaseListBoxProps) {
  const contextProps = React.useContext(PlasmicListBoxContext);
  const isStandalone: boolean = !contextProps;
  const { options: _rawOptions, ...rest } = props;
  const { options } = useStrictOptions(props);
  const { renderItem, renderSection, ...mergedProps } = mergeProps(
    contextProps,
    rest,
    isStandalone ? { items: options } : {}
  );

  // Tell the prop control about whether the listbox is standalone or not, so it can hide/show the items prop
  props.setControlContextData?.({
    isStandalone,
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

export function registerListBox(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseListBox>
) {
  registerComponentHelper(
    loader,
    BaseListBox,
    {
      name: makeComponentName("listbox"),
      displayName: "Aria ListBox",
      importPath: "@plasmicpkgs/react-aria/skinny/registerListBox",
      importName: "BaseListBox",
      props: {
        options: {
          ...makeOptionsPropType(),
          displayName: "Items",
          hidden: (
            _ps: BaseListBoxProps,
            ctx: BaseListBoxControlContextData | null
          ) => !ctx?.isStandalone,
        },
        renderItem: {
          type: "slot",
          displayName: "Render Item",
          renderPropParams: ["itemProps"],
        },
        renderSection: {
          type: "slot",
          displayName: "Render Section",
          renderPropParams: ["sectionProps"],
        },
      },
    },
    overrides
  );

  registerListBoxItem(loader, {
    parentComponentName: makeComponentName("listbox"),
  });
}
