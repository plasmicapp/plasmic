import { mergeProps } from "@react-aria/utils";
import React from "react";
import { Label } from "react-aria-components";
import { PlasmicLabelContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  Registerable,
  registerComponentHelper,
} from "./utils";

export function BaseLabel(props: React.ComponentProps<typeof Label>) {
  const contextProps = React.useContext(PlasmicLabelContext);
  return <Label {...mergeProps(contextProps, props)} />;
}
export function registerLabel(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseLabel>
) {
  registerComponentHelper(
    loader,
    BaseLabel,
    {
      name: "plasmic-react-aria-label",
      displayName: "BaseLabel",
      importPath: "@plasmicpkgs/react-aria/registerLabel",
      importName: "BaseLabel",
      props: {
        children: {
          type: "slot",
          defaultValue: {
            type: "text",
            value: "Label",
          },
          mergeWithParent: true as any,
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
