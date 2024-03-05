import React from "react";
import type { LabelProps } from "react-aria-components";
import { Label } from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export function BaseLabel(props: LabelProps) {
  return <Label {...props} />;
}

export function registerLabel(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseLabel>
) {
  registerComponentHelper(
    loader,
    BaseLabel,
    {
      name: makeComponentName("label"),
      displayName: "BaseLabel",
      importPath: "@plasmicpkgs/react-aria/registerLabel",
      importName: "BaseLabel",
      props: {
        children: {
          type: "slot",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
