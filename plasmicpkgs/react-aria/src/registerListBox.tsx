import { mergeProps } from "@react-aria/utils";
import React from "react";
import { ListBox } from "react-aria-components";
import {
  PlasmicItemContext,
  PlasmicListBoxContext,
  PlasmicSectionContext,
} from "./contexts";
import {
  registerListBoxItem,
  type BaseListBoxItem,
} from "./registerListBoxItem";
import type { BaseSection } from "./registerSection";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export interface BaseListBoxProps extends React.ComponentProps<typeof ListBox> {
  makeItemProps?: (
    item: any
  ) => Partial<React.ComponentProps<typeof BaseListBoxItem>>;
  makeSectionProps?: (
    section: any
  ) => Partial<React.ComponentProps<typeof BaseSection>>;
  renderItem?: (item: any) => React.ReactNode;
  renderSection?: (section: any) => React.ReactNode;
  getItemType?: (thing: any) => "item" | "section";
}

const STANDALONE_PROPS: Partial<BaseListBoxProps> = {
  getItemType: (item: any) => item.type,
  items: [
    { type: "item", value: "op1", label: "Option 1" },
    { type: "item", value: "op2", label: "Option 2" },
    { type: "item", value: "op3", label: "Option 3" },
    {
      type: "section",
      label: "Section 1",
      items: [
        { type: "item", value: "s1op1", label: "Section 1 Option 1" },
        { type: "item", value: "s1op2", label: "Section 1 Option 2" },
        { type: "item", value: "s1op3", label: "Section 1 Option 3" },
      ],
    },
    {
      type: "section",
      label: "Section 2",
      items: [
        { type: "item", value: "s2op1", label: "Section 2 Option 1" },
        { type: "item", value: "s2op2", label: "Section 2 Option 2" },
        { type: "item", value: "s2op3", label: "Section 2 Option 3" },
      ],
    },
  ],
  makeItemProps: (item: any) => ({
    key: item.value,
    textValue: item.label,
    children: item.label,
  }),
  makeSectionProps: (section: any) => ({
    section: section,
    key: section.label,
  }),
};

export function BaseListBox(props: BaseListBoxProps) {
  const contextProps = React.useContext(PlasmicListBoxContext);
  const isStandalone: boolean = !contextProps;
  const {
    makeItemProps,
    makeSectionProps,
    renderItem,
    renderSection,
    getItemType,
    ...rest
  } = mergeProps(contextProps, props, isStandalone ? STANDALONE_PROPS : {});
  return (
    <ListBox {...mergeProps(contextProps, rest)}>
      {(item) => {
        if (getItemType?.(item) === "section") {
          const sectionProps = makeSectionProps?.(item);
          return (
            <PlasmicSectionContext.Provider
              key={sectionProps?.key}
              value={{ ...sectionProps, makeItemProps, renderItem }}
            >
              {renderSection?.(item)}
            </PlasmicSectionContext.Provider>
          );
        } else {
          const itemProps = makeItemProps?.(item);
          return (
            <PlasmicItemContext.Provider key={itemProps?.key} value={itemProps}>
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
      displayName: "BaseListBox",
      importPath: "@plasmicpkgs/react-aria/registerListBox",
      importName: "BaseListBox",
      props: {
        renderItem: {
          type: "slot",
          displayName: "Render Item",
          renderPropParams: ["item"],
        },
        renderSection: {
          type: "slot",
          displayName: "Render Section",
          renderPropParams: ["section"],
        },
        className: {
          type: "class",
          displayName: "Additional states",
          selectors: [
            {
              selector: ":self[data-focused]",
              label: "Focused",
            },
            {
              selector: ":self[data-focus-visible]",
              label: "Focused by keyboard",
            },
          ],
        },
      },
    },
    overrides
  );

  registerListBoxItem(loader, {
    parentComponentName: makeComponentName("listbox"),
  });
}
