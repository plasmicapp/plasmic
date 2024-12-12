import React from "react";
import type { TextProps } from "react-aria-components";
import { Text } from "react-aria-components";
import { COMMON_STYLES } from "./common";
import {
  CodeComponentMetaOverrides,
  extractPlasmicDataProps,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export function BaseText({ children, slot, className, ...rest }: TextProps) {
  return (
    <Text
      {...extractPlasmicDataProps(rest)}
      slot={slot}
      className={className}
      style={COMMON_STYLES}
    >
      {children}
    </Text>
  );
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
          mergeWithParent: true,
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
