import { Node } from "@react-types/shared";
import * as React from "react";
import { useListBoxSection, useSeparator } from "react-aria";
import { pick } from "../../common";
import { Overrides } from "../../render/elements";
import { renderCollectionNode, SectionLikeProps } from "../collection-utils";
import {
  AnyPlasmicClass,
  mergeVariantToggles,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  PLUME_STRICT_MODE,
} from "../plume-utils";
import { getDefaultPlasmicProps } from "../props-utils";
import { SelectContext } from "./context";

export interface BaseSelectOptionGroupProps extends SectionLikeProps {}

interface SelectOptionGroupConfig<C extends AnyPlasmicClass> {
  noTitleVariant: PlasmicClassVariants<C>;
  isFirstVariant: PlasmicClassVariants<C>;

  optionsSlot: keyof PlasmicClassArgs<C>;
  titleSlot: keyof PlasmicClassArgs<C>;

  root: keyof PlasmicClassOverrides<C>;
  separator: keyof PlasmicClassOverrides<C>;
  titleContainer: keyof PlasmicClassOverrides<C>;
  optionsContainer: keyof PlasmicClassOverrides<C>;
}

export function useSelectOptionGroup<
  P extends BaseSelectOptionGroupProps,
  C extends AnyPlasmicClass
>(plasmicClass: C, props: P, config: SelectOptionGroupConfig<C>) {
  const state = React.useContext(SelectContext);

  // `node` should exist if the OptionGroup was instantiated properly
  // within a Select
  const node = (props as any)._node as
    | Node<React.ReactElement<BaseSelectOptionGroupProps>>
    | undefined;

  if (!state || !node) {
    if (PLUME_STRICT_MODE) {
      throw new Error(
        "You can only use a Select.OptionGroup within a Select component."
      );
    }
    return getDefaultPlasmicProps(plasmicClass, props);
  }

  const { headingProps, groupProps } = useListBoxSection({
    heading: props.title,
    "aria-label": props["aria-label"],
  });

  const { separatorProps } = useSeparator({
    elementType: "li",
  });

  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantToggles(
      { def: config.noTitleVariant, active: !props.title },
      {
        def: config.isFirstVariant,
        active: state.collection.getFirstKey() === node.key,
      }
    ),
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    [config.titleSlot]: props.title,
    [config.optionsSlot]: Array.from(node.childNodes).map((childNode) =>
      renderCollectionNode(childNode)
    ),
  };

  const overrides: Overrides = {
    [config.separator]: {
      props: {
        ...separatorProps,
      },
    },
    [config.titleContainer]: {
      props: {
        role: "presentation",
        ...headingProps,
      },
      ...(!props.title && {
        render: () => null,
      }),
    },
    [config.optionsContainer]: {
      props: {
        ...groupProps,
      },
    },
  };

  return {
    plasmicProps: {
      variants: variants as PlasmicClassVariants<C>,
      args: args as PlasmicClassArgs<C>,
      overrides: overrides as PlasmicClassOverrides<C>,
    },
  };
}
