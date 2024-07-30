import React from "react";
import type { TextProps } from "react-aria-components";
import { Text } from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export function BaseText({ children, ...rest }: TextProps) {
  return <Text {...rest}>{children}</Text>;
}

export const TEXT_COMPONENT_NAME = makeComponentName("text");

export function registerText(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseText>
) {
  return registerComponentHelper(
    loader,
    BaseText,
    {
      name: TEXT_COMPONENT_NAME,
      displayName: "Aria Text",
      importPath: "@plasmicpkgs/react-aria/skinny/registerText",
      importName: "BaseText",
      props: {
        children: {
          type: "slot",
          mergeWithParent: true as any,
          defaultValue: {
            type: "text",
            value: "Some text...",
          },
        },
        slot: {
          type: "choice",
          options: ["label", "description"],
          defaultValueHint: "label",
          defaultValue: "label",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
