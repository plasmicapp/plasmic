import { useOption as useAriaOption } from "@react-aria/listbox";
import { useFocusableRef } from "@react-spectrum/utils";
import { FocusableRef } from "@react-types/shared";
import * as React from "react";
import { mergeProps, pick } from "../../common";
import { Overrides } from "../../render/elements";
import {
  AnyPlasmicClass,
  mergeVariantDefTuples,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  VariantDefTuple,
} from "../plume-utils";
import { SelectContext } from "./context";

export interface BaseSelectOptionProps {
  value: string;
  textValue?: string;
  "aria-label"?: string;
  children?: React.ReactNode;
}

interface SelectOptionConfig<C extends AnyPlasmicClass> {
  isSelectedVariant: VariantDefTuple<PlasmicClassVariants<C>>;
  isDisabledVariant?: VariantDefTuple<PlasmicClassVariants<C>>;
  isHighlightedVariant?: VariantDefTuple<PlasmicClassVariants<C>>;

  contentSlot: keyof PlasmicClassArgs<C>;

  root: keyof PlasmicClassOverrides<C>;
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
  const { value: itemKey, children } = props;
  const state = React.useContext(SelectContext);

  if (!state) {
    throw new Error(
      "You can only use a SelectOption within a Select component."
    );
  }

  const item = state.collection.getItem(itemKey);
  const isSelected = state.selectionManager.isSelected(itemKey);
  const isDisabled = state.disabledKeys.has(itemKey);
  const isHighlighted =
    state.selectionManager.isFocused &&
    state.selectionManager.focusedKey === itemKey;

  const ref = useFocusableRef(outerRef);

  const { optionProps } = useAriaOption(
    {
      isSelected,
      isDisabled,
      "aria-label": item && item["aria-label"],
      key: itemKey,
      shouldSelectOnPressUp: true,
      shouldFocusOnHover: true,
      isVirtualized: false,
    },
    state,
    ref
  );

  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantDefTuples([
      isSelected && config.isSelectedVariant,
      isDisabled && config.isDisabledVariant,
      isHighlighted && config.isHighlightedVariant,
    ]),
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    [config.contentSlot]: children ?? itemKey,
  };

  const overrides: Overrides = {
    [config.root]: {
      props: mergeProps(optionProps, { ref }),
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
