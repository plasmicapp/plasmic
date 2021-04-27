import { Node } from "@react-types/shared";
import * as React from "react";
import { useListBoxSection, useSeparator } from "react-aria";
import { pick } from "../../common";
import { Overrides } from "../../render/elements";
import {
  AnyPlasmicClass,
  mergeVariantToggles,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  PLUME_STRICT_MODE,
} from "../plume-utils";
import { SelectContext } from "./context";
import { renderCollectionNode } from "./select";

export interface BaseSelectOptionGroupProps {
  title?: React.ReactNode;
  "aria-label"?: string;
  children?: React.ReactNode;
}

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

  if (PLUME_STRICT_MODE && (!state || !node)) {
    throw new Error(
      "You can only use a Select.OptionGroup within a Select component."
    );
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
        active:
          state && node ? state.collection.getFirstKey() === node.key : false,
      }
    ),
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    [config.titleSlot]: props.title,
    [config.optionsSlot]: node
      ? // if `node` exists (so OptionGroup is correctly placed within a Select),
        // we use the children nodes that have been derived by the Collections API
        // and render those, instead of `props.children`.  These nodes will have
        // derived keys, etc.
        Array.from(node.childNodes).map((childNode) =>
          renderCollectionNode(childNode)
        )
      : // Otherwise, we're not really in a working Select, but we still want to
        // best-effort render as closely to configured as possible.  So we just
        // render the children.
        props.children,
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
