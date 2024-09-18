import { mergeProps } from "@react-aria/utils";
import React from "react";
import { Header, Key, Section } from "react-aria-components";
import { PlasmicListBoxContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
  Styleable,
} from "./utils";

export interface BaseSectionProps extends Styleable {
  items: React.ReactNode;
  header: React.ReactNode;
  key?: Key;
}

export function BaseSection(props: BaseSectionProps) {
  const { header, items, ...rest } = props;
  const contextProps = React.useContext(PlasmicListBoxContext);
  const mergedProps = mergeProps(contextProps, rest);

  return (
    <Section {...mergedProps}>
      <Header>{header}</Header>
      {items}
    </Section>
  );
}

export function registerSection(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseSection>
) {
  return registerComponentHelper(
    loader,
    BaseSection,
    {
      name: makeComponentName("section"),
      displayName: "Aria Section",
      importPath: "@plasmicpkgs/react-aria/skinny/registerSection",
      importName: "BaseSection",
      defaultStyles: {
        width: "stretch",
        padding: "10px",
      },
      props: {
        header: {
          type: "slot",
          mergeWithParent: true,
          defaultValue: [
            {
              type: "text",
              value: "Section Header.",
            },
          ],
        },
        items: {
          type: "slot",
          mergeWithParent: true,
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
