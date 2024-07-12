import { PlasmicElement } from "@plasmicapp/host";
import { mergeProps } from "@react-aria/utils";
import React from "react";
import { ListBoxItem } from "react-aria-components";
import { PlasmicItemContext } from "./contexts";
import { DESCRIPTION_COMPONENT_NAME } from "./registerDescription";
import { TEXT_COMPONENT_NAME } from "./registerText";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export function BaseListBoxItem(
  props: React.ComponentProps<typeof ListBoxItem>
) {
  const contextProps = React.useContext(PlasmicItemContext);
  const mergedProps = mergeProps(contextProps, props);

  return (
    <ListBoxItem {...mergedProps} textValue={(contextProps as any).label}>
      {mergedProps.children as React.ReactNode}
    </ListBoxItem>
  );
}

export const makeDefaultListBoxItemChildren = (
  label: string,
  description?: string
): PlasmicElement => ({
  type: "vbox",
  styles: {
    display: "flex",
    alignItems: "flex-start",
    gap: "2px",
  },
  children: [
    {
      type: "component",
      name: TEXT_COMPONENT_NAME,
      props: {
        slot: "label",
        children: {
          type: "text",
          styles: {
            fontWeight: 500,
          },
          value: label,
        },
      },
    },
    {
      type: "component",
      name: DESCRIPTION_COMPONENT_NAME,
      props: {
        children: {
          type: "text",
          styles: {
            color: "#838383",
          },
          value: description ?? `Some description for ${label}...`,
        },
      },
    },
  ],
});

export function registerListBoxItem(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseListBoxItem>
) {
  return registerComponentHelper(
    loader,
    BaseListBoxItem,
    {
      name: makeComponentName("item"),
      displayName: "Aria ListBoxItem",
      importPath: "@plasmicpkgs/react-aria/skinny/registerListBoxItem",
      importName: "BaseListBoxItem",
      props: {
        children: {
          type: "slot",
          defaultValue: makeDefaultListBoxItemChildren("Item"),
        },
      },
    },
    overrides
  );
}
