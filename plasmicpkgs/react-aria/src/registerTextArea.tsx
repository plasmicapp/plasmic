import React from "react";
import type { TextAreaProps } from "react-aria-components";
import { TextArea } from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export function BaseTextArea(props: TextAreaProps) {
  return <TextArea {...props} />;
}

export function registerTextArea(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseTextArea>
) {
  registerComponentHelper(
    loader,
    BaseTextArea,
    {
      name: makeComponentName("textarea"),
      displayName: "Aria TextArea",
      importPath: "@plasmicpkgs/react-aria/skinny/registerTextArea",
      importName: "BaseTextArea",
      props: {
        placeholder: {
          type: "string",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
