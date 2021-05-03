import { useMenuItem as useAriaMenuItem } from "@react-aria/menu";
import { Node } from "@react-types/shared";
import * as React from "react";
import { mergeProps, pick } from "../../common";
import { Overrides } from "../../render/elements";
import { ItemLikeProps } from "../collection-utils";
import {
  AnyPlasmicClass,
  mergeVariantToggles,
  noOutline,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  PLUME_STRICT_MODE,
  VariantDef,
} from "../plume-utils";
import { getDefaultPlasmicProps } from "../props-utils";
import { MenuContext } from "./context";

export interface BaseMenuItemProps extends ItemLikeProps {
  /**
   * Called when this item is selected
   */
  onAction?: (key: string) => void;
}

interface MenuItemConfig<C extends AnyPlasmicClass> {
  isDisabledVariant?: VariantDef<PlasmicClassVariants<C>>;
  isHighlightedVariant?: VariantDef<PlasmicClassVariants<C>>;

  labelSlot: keyof PlasmicClassArgs<C>;

  root: keyof PlasmicClassOverrides<C>;
  labelContainer: keyof PlasmicClassOverrides<C>;
}

export function useMenuItem<
  P extends BaseMenuItemProps,
  C extends AnyPlasmicClass
>(plasmicClass: C, props: P, config: MenuItemConfig<C>) {
  const context = React.useContext(MenuContext);

  if (!context) {
    if (PLUME_STRICT_MODE) {
      throw new Error("You can only use a Menu.Item within a Menu component.");
    }

    return getDefaultPlasmicProps(plasmicClass, props);
  }

  const { children, onAction } = props;

  const { state, menuProps } = context;

  // We pass in the Node secretly as an undocumented prop from <Select />
  const node = (props as any)._node as Node<
    React.ReactElement<BaseMenuItemProps>
  >;

  const isDisabled = state.disabledKeys.has(node.key);
  const isHighlighted =
    state.selectionManager.isFocused &&
    state.selectionManager.focusedKey === node.key;

  const ref = React.useRef<HTMLLIElement>(null);

  const { menuItemProps, labelProps } = useAriaMenuItem(
    mergeProps(
      {
        // We need to merge both the onAction on MenuItem and the onAction
        // on Menu
        onAction,
      },
      {
        onAction: menuProps.onAction,
        onClose: menuProps.onClose,
      },
      {
        isDisabled,
        "aria-label": node && node["aria-label"],
        key: node.key,
        isVirtualized: false,
        closeOnSelect: true,
      }
    ),
    state,
    ref
  );

  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantToggles(
      { def: config.isDisabledVariant, active: isDisabled },
      { def: config.isHighlightedVariant, active: isHighlighted }
    ),
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    [config.labelSlot]: children,
  };

  const overrides: Overrides = {
    [config.root]: {
      as: "li",
      props: mergeProps(menuItemProps, { ref, style: noOutline() }),
    },
    [config.labelContainer]: {
      props: { ...labelProps },
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
