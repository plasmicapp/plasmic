import { mergeProps } from "@react-aria/utils";
import React from "react";
import { Key, ListBoxItem } from "react-aria-components";
import { PlasmicItemContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export function BaseListBoxItem(
  props: React.ComponentProps<typeof ListBoxItem> & {
    key?: Key;
  }
) {
  const contextProps = React.useContext(PlasmicItemContext);
  const mergedProps = mergeProps(contextProps, props);
  return <ListBoxItem id={mergedProps.key ?? undefined} {...mergedProps} />;
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
      displayName: "BaseListBoxItem",
      importPath: "@plasmicpkgs/react-aria/registerListBoxItem",
      importName: "BaseListBoxItem",
      props: {
        className: {
          type: "class",
          displayName: "Additional states",
          selectors: [
            {
              selector: ":self[data-selected]",
              label: "Selected",
            },
            {
              selector: ":self[data-focused], :self[data-hovered]",
              label: "Focused",
            },
            {
              selector: ":self[data-disabled]",
              label: "Disabled",
            },
          ],
        },
      },
    },
    overrides
  );
}
