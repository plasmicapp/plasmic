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
import { BaseListBoxItem } from "./registerListBoxItem";
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

  // Passed down via context from Select, ComboBox
  key?: Key;
  section?: StrictSectionType;

  // Passed down via context from ListBox
  makeItemProps?: (
    item: any
  ) => Partial<React.ComponentProps<typeof BaseListBoxItem>>;
  renderItem?: (item?: any) => React.ReactNode;
}

export function BaseSection(props: BaseSectionProps) {
  const contextProps = React.useContext(PlasmicSectionContext);
  const mergedProps = mergeProps(contextProps, props);
  const { section, renderHeader, key, makeItemProps, renderItem, ...rest } =
    mergedProps;
  return (
    <Section id={key ?? undefined} {...rest}>
      <PlasmicHeaderContext.Provider value={{ children: section?.label }}>
        {renderHeader?.(section)}
      </PlasmicHeaderContext.Provider>
      <Collection items={section?.items}>
        {(item) => {
          const itemProps = makeItemProps?.(item);
          return (
            <PlasmicItemContext.Provider key={itemProps?.key} value={itemProps}>
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
  registerComponentHelper(
    loader,
    BaseSection,
    {
      name: makeComponentName("section"),
      displayName: "Aria Section",
      importPath: "@plasmicpkgs/react-aria/skinny/registerSection",
      importName: "BaseSection",
      props: {
        renderHeader: {
          type: "slot",
          displayName: "Render section header",
          renderPropParams: ["section"],
        },
      },
    },
    overrides
  );

  const thisName = makeChildComponentName(
    overrides?.parentComponentName,
    makeComponentName("section")
  );

  registerHeader(loader, {
    parentComponentName: thisName,
  });
}
