import React from "react";
import { Label, LabelProps } from "react-aria-components";
import { COMMON_STYLES, createAriaLabelProp, createIdProp } from "./common";
import {
  CodeComponentMetaOverrides,
  extractPlasmicDataProps,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export interface BaseLabelProps extends LabelProps {
}

export function BaseLabel({ children, className, id, "aria-label": ariaLabel, ...rest }: BaseLabelProps) {
  const dataProps = extractPlasmicDataProps(rest);
  return (
    <Label
      {...dataProps}
      id={id}
      className={className}
      style={COMMON_STYLES}
      aria-label={ariaLabel}>
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
        id: createIdProp("Label"),
        "aria-label": createAriaLabelProp("Label"),
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
