import { mergeProps } from "@react-aria/utils";
import React from "react";
import { Header } from "react-aria-components";
import { PlasmicHeaderContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper
} from "./utils";
export function BaseHeader(props: React.ComponentProps<typeof Header>) {
  const contextProps = React.useContext(PlasmicHeaderContext);
  return (
    <Header {...mergeProps(contextProps, props)} />
  );
}

export function registerHeader(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseHeader>
) {
  registerComponentHelper(
    loader,
    BaseHeader,
    {
      name: makeComponentName("header"),
      displayName: "BaseHeader",
      importPath: "@plasmicpkgs/react-aria/registerHeader",
      importName: "BaseHeader",
      props: {},
    },
    overrides
  );
}
