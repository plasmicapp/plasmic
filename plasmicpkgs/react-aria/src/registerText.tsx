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

export function registerText(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseText>
) {
  registerComponentHelper(
    loader,
    BaseText,
    {
      name: makeComponentName("text"),
      displayName: "BaseText",
      importPath: "@plasmicpkgs/react-aria/registerText",
      importName: "BaseText",
      props: {
        children: {
          type: "slot",
        },
        slot: {
          type: "string",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
