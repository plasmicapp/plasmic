import React from "react";
import type { InputProps } from "react-aria-components";
import { Input } from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export function BaseInput(props: InputProps) {
  return <Input {...props} />;
}

export function registerInput(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseInput>
) {
  registerComponentHelper(
    loader,
    BaseInput,
    {
      name: makeComponentName("input"),
      displayName: "Aria Input",
      importPath: "@plasmicpkgs/react-aria/skinny/registerInput",
      importName: "BaseInput",
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
