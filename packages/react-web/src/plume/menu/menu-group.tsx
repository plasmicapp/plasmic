import { Node } from "@react-types/shared";
import * as React from "react";
import { useMenuSection } from "@react-aria/menu";
import { useSeparator } from "@react-aria/separator";
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
import {
  getDefaultPlasmicProps,
  getStyleProps,
  StyleProps,
} from "../props-utils";
import { MenuContext } from "./context";

export interface BaseMenuGroupProps extends SectionLikeProps, StyleProps {}

interface MenuGroupConfig<C extends AnyPlasmicClass> {
  noTitleVariant: PlasmicClassVariants<C>;
  isFirstVariant: PlasmicClassVariants<C>;

  itemsSlot: keyof PlasmicClassArgs<C>;
  titleSlot: keyof PlasmicClassArgs<C>;

  root: keyof PlasmicClassOverrides<C>;
  separator: keyof PlasmicClassOverrides<C>;
  titleContainer: keyof PlasmicClassOverrides<C>;
  itemsContainer: keyof PlasmicClassOverrides<C>;
}

export function useMenuGroup<
  P extends BaseMenuGroupProps,
  C extends AnyPlasmicClass
>(plasmicClass: C, props: P, config: MenuGroupConfig<C>) {
  const context = React.useContext(MenuContext);

  const node = (props as any)._node as
    | Node<React.ReactElement<BaseMenuGroupProps>>
    | undefined;

  if (!context || !node) {
    if (PLUME_STRICT_MODE) {
      throw new Error("You can only use a Menu.Group within a Menu component.");
    }
    return getDefaultPlasmicProps(plasmicClass, props);
  }

  const { headingProps, groupProps } = useMenuSection({
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
        active: context.state.collection.getFirstKey() === node.key,
      }
    ),
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    [config.titleSlot]: props.title,
    [config.itemsSlot]: Array.from(node.childNodes).map((childNode) =>
      renderCollectionNode(childNode)
    ),
  };

  const overrides: Overrides = {
    [config.root]: {
      props: getStyleProps(props),
    },
    [config.separator]: {
      props: {
        ...separatorProps,
      },
      as: "li",
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
    [config.itemsContainer]: {
      props: {
        ...groupProps,
      },
      as: "ul",
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
