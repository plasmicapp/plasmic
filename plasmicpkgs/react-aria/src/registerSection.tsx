import { mergeProps } from "@react-aria/utils";
import React from "react";
import { Collection, Key, Section } from "react-aria-components";
import {
  PlasmicHeaderContext,
  PlasmicItemContext,
  PlasmicSectionContext,
} from "./contexts";
import type { StrictSectionType } from "./option-utils";
import { registerHeader } from "./registerHeader";
import {
  CodeComponentMetaOverrides,
  makeChildComponentName,
  makeComponentName,
  Registerable,
  registerComponentHelper,
  Styleable,
} from "./utils";

export interface BaseSectionProps extends Styleable {
  // Configured via Studio
  renderHeader?: (section: any) => React.ReactNode;

  // Passed down via context from ListBox
  renderItem?: (item?: any) => React.ReactNode;
  key?: Key;
  section?: StrictSectionType;
}

export function BaseSection(props: BaseSectionProps) {
  const contextProps = React.useContext(PlasmicSectionContext);
  const mergedProps = mergeProps(contextProps, props);
  const { section, renderHeader, key, renderItem } = mergedProps;

  return (
    <Section id={key} {...mergedProps}>
      <PlasmicHeaderContext.Provider value={{ children: section?.label }}>
        {renderHeader?.(section)}
      </PlasmicHeaderContext.Provider>
      <Collection items={section?.items}>
        {(item) => {
          return (
            <PlasmicItemContext.Provider value={item}>
              {renderItem?.(item)}
            </PlasmicItemContext.Provider>
          );
        }}
      </Collection>
    </Section>
  );
}

export function registerSection(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseSection>
) {
  const thisName = makeChildComponentName(
    overrides?.parentComponentName,
    makeComponentName("section")
  );

  const headerMeta = registerHeader(loader, {
    parentComponentName: thisName,
  });

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
        renderHeader: {
          type: "slot",
          displayName: "Render section header",
          renderPropParams: ["sectionProps"],
          defaultValue: {
            type: "component",
            name: headerMeta.name,
          },
        },
      },
    },
    overrides
  );
}
