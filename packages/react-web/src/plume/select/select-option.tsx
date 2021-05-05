import { useOption as useAriaOption } from "@react-aria/listbox";
import { useFocusableRef } from "@react-spectrum/utils";
import { FocusableRef, Node } from "@react-types/shared";
import * as React from "react";
import { pick } from "../../common";
import { mergeProps } from "../../react-utils";
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
import {
  getDefaultPlasmicProps,
  getStyleProps,
  StyleProps,
} from "../props-utils";
import { SelectContext } from "./context";

export interface BaseSelectOptionProps extends ItemLikeProps, StyleProps {}

interface SelectOptionConfig<C extends AnyPlasmicClass> {
  isSelectedVariant: VariantDef<PlasmicClassVariants<C>>;
  isDisabledVariant?: VariantDef<PlasmicClassVariants<C>>;
  isHighlightedVariant?: VariantDef<PlasmicClassVariants<C>>;

  labelSlot: keyof PlasmicClassArgs<C>;

  root: keyof PlasmicClassOverrides<C>;
  labelContainer: keyof PlasmicClassOverrides<C>;
}

export type SelectOptionRef = FocusableRef<HTMLElement>;

export function useSelectOption<
  P extends BaseSelectOptionProps,
  C extends AnyPlasmicClass
>(
  plasmicClass: C,
  props: P,
  config: SelectOptionConfig<C>,
  outerRef: SelectOptionRef = null
) {
  const state = React.useContext(SelectContext);

  if (!state) {
    // If no context, then we are being incorrectly used.  Complain or just don't
    // bother installing any hooks.  It's okay to violate rules of hooks here
    // because this instance won't suddenly be used correctly in another render.
    if (PLUME_STRICT_MODE) {
      throw new Error(
        "You can only use a Select.Option within a Select component."
      );
    }

    return getDefaultPlasmicProps(plasmicClass, props);
  }

  const { children } = props;

  // We pass in the Node secretly as an undocumented prop from <Select />
  const node = (props as any)._node as Node<
    React.ReactElement<BaseSelectOptionProps>
  >;

  const isSelected = state.selectionManager.isSelected(node.key);
  const isDisabled = state.disabledKeys.has(node.key);
  const isHighlighted =
    state.selectionManager.isFocused &&
    state.selectionManager.focusedKey === node.key;

  const ref = useFocusableRef(outerRef);

  const { optionProps, labelProps } = useAriaOption(
    {
      isSelected,
      isDisabled,
      "aria-label": node && node["aria-label"],
      key: node.key,
      shouldSelectOnPressUp: true,
      shouldFocusOnHover: true,
      isVirtualized: false,
    },
    state,
    ref
  );

  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantToggles(
      { def: config.isSelectedVariant, active: isSelected },
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
      props: mergeProps(optionProps, getStyleProps(props), {
        ref,
        style: noOutline(),
      }),
    },
    [config.labelContainer]: {
      props: labelProps,
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
