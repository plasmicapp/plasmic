import React from "react";
import { Header, Section } from "react-aria-components";
import { COMMON_STYLES } from "./common";
import { PlasmicListBoxContext } from "./contexts";
import { BaseListBox } from "./registerListBox";
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
}

export function BaseSection(props: BaseSectionProps) {
  const { header, items, ...rest } = props;
  const contextProps = React.useContext(PlasmicListBoxContext);
  const isStandalone = !contextProps;

  const section = (
    <Section {...rest} style={COMMON_STYLES}>
      <Header>{header}</Header>
      {items}
    </Section>
  );

  if (isStandalone) {
    return (
      // BaseListbox should give section a listbox context (that it can't be used without)
      // as well as the id manager (that is needed to identify and warn about duplication of ids)
      // selection mode needs to be single/multiple to be able to trigger hover state on it.
      <BaseListBox selectionMode="single">{section}</BaseListBox>
    );
  }

  return section;
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
