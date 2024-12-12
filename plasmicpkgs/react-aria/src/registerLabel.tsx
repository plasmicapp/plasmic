import React from "react";
import { Label, LabelProps } from "react-aria-components";
import { COMMON_STYLES } from "./common";
import {
  CodeComponentMetaOverrides,
  extractPlasmicDataProps,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export function BaseLabel({ children, className, ...rest }: LabelProps) {
  return (
    <Label
      {...extractPlasmicDataProps(rest)}
      className={className}
      style={COMMON_STYLES}
    >
      {children}
    </Label>
  );
}
export const LABEL_COMPONENT_NAME = makeComponentName("label");

export function registerLabel(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseLabel>
) {
  registerComponentHelper(
    loader,
    BaseLabel,
    {
      name: LABEL_COMPONENT_NAME,
      displayName: "Aria Label",
      importPath: "@plasmicpkgs/react-aria/skinny/registerLabel",
      importName: "BaseLabel",
      defaultStyles: {
        cursor: "pointer",
      },
      props: {
        children: {
          type: "slot",
          mergeWithParent: true,
          defaultValue: {
            type: "text",
            value: "Label",
          },
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
