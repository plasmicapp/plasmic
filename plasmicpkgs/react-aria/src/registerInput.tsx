import { mergeProps } from "@react-aria/utils";
import React from "react";
import { Input } from "react-aria-components";
import { PlasmicInputContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export function BaseInput(props: React.ComponentProps<typeof Input>) {
  const contextProps = React.useContext(PlasmicInputContext);
  return <Input {...mergeProps(contextProps, props)} />;
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
      displayName: "BaseInput",
      importPath: "@plasmicpkgs/react-aria/registerInput",
      importName: "BaseInput",
      props: {
        className: {
          type: "class",
          displayName: "Styles in different states",
          selectors: [
            {
              selector: ":self[data-hovered]",
              label: "Hovered",
            },
            {
              selector: ":self[data-focused]",
              label: "Focused",
            },
            {
              selector: ":self[data-focus-visible]",
              label: "Focus visible",
            },
            {
              selector: ":self[data-disabled]",
              label: "Disabled",
            },
            {
              selector: ":self::placeholder",
              label: "Placeholder",
            },
          ],
        },
      },
    },
    overrides
  );
}
