import { mergeProps } from "@react-aria/utils";
import React from "react";
import { ListBoxItem } from "react-aria-components";
import { PlasmicItemContext } from "./contexts";
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
    <ListBoxItem {...mergedProps}>
      {mergedProps.children as React.ReactNode}
    </ListBoxItem>
  );
}

export function registerListBoxItem(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseListBoxItem>
) {
  registerComponentHelper(
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
        },
      },
    },
    overrides
  );
}
