import { mergeProps } from "@react-aria/utils";
import React from "react";
import { Header } from "react-aria-components";
import { PlasmicHeaderContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";
export function BaseHeader(props: React.ComponentProps<typeof Header>) {
  const contextProps = React.useContext(PlasmicHeaderContext);
  return <Header {...mergeProps(contextProps, props)} />;
}

export function registerHeader(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseHeader>
) {
  return registerComponentHelper(
    loader,
    BaseHeader,
    {
      name: makeComponentName("header"),
      displayName: "Aria Header",
      importPath: "@plasmicpkgs/react-aria/skinny/registerHeader",
      importName: "BaseHeader",
      defaultStyles: {
        fontWeight: "bold",
        fontSize: "20px",
      },
      props: {},
    },
    overrides
  );
}
