import { useOption as useAriaOption } from "@react-aria/listbox";
import { useFocusableRef } from "@react-spectrum/utils";
import { FocusableRef } from "@react-types/shared";
import * as React from "react";
import { ListState } from "react-stately";
import { mergeProps, pick } from "../../common";
import { Overrides } from "../../render/elements";
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
import { SelectContext } from "./context";

export interface BaseSelectOptionProps {
  value: string;
  textValue?: string;
  "aria-label"?: string;
  children?: React.ReactNode;
  isDisabled?: boolean;
}

interface SelectOptionConfig<C extends AnyPlasmicClass> {
  isSelectedVariant: VariantDef<PlasmicClassVariants<C>>;
  isDisabledVariant?: VariantDef<PlasmicClassVariants<C>>;
  isHighlightedVariant?: VariantDef<PlasmicClassVariants<C>>;

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
  const state = React.useContext(SelectContext);

  if (!state) {
    if (PLUME_STRICT_MODE) {
      throw new Error(
        "You can only use a Select.Option within a Select component."
      );
    }
  }

  // Depending on whether we are in "real" usage (within the correct context)
  // or in "fake" usage (somewhere in live mode or just littered outside the
  // context), we use real or fake props.  Note that it's okay for this to
  // be conditional, as there's no way for an instance to switch between
  // the two.
  if (state) {
    return useRealPlasmicProps(state, plasmicClass, props, config, outerRef);
  } else {
    return useFakePlasmicProps(plasmicClass, props, config, outerRef);
  }
}

function useRealPlasmicProps<
  P extends BaseSelectOptionProps,
  C extends AnyPlasmicClass
>(
  state: ListState<any>,
  plasmicClass: C,
  props: P,
  config: SelectOptionConfig<C>,
  outerRef: SelectOptionRef = null
) {
  const { value: itemKey, children } = props;

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
    ...mergeVariantToggles(
      { def: config.isSelectedVariant, active: isSelected },
      { def: config.isDisabledVariant, active: isDisabled },
      { def: config.isHighlightedVariant, active: isHighlighted }
    ),
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    [config.contentSlot]: children ?? itemKey,
  };

  const overrides: Overrides = {
    [config.root]: {
      props: mergeProps(optionProps, { ref, style: noOutline() }),
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

function useFakePlasmicProps<
  P extends BaseSelectOptionProps,
  C extends AnyPlasmicClass
>(
  plasmicClass: C,
  props: P,
  config: SelectOptionConfig<C>,
  outerRef: SelectOptionRef = null
) {
  const ref = useFocusableRef(outerRef);

  const overrides: Overrides = {
    [config.root]: {
      props: { ref, style: noOutline() },
    },
  };

  return {
    plasmicProps: {
      variants: pick(
        props,
        ...plasmicClass.internalVariantProps
      ) as PlasmicClassVariants<C>,
      args: pick(
        props,
        ...plasmicClass.internalArgProps
      ) as PlasmicClassArgs<C>,
      overrides: overrides as PlasmicClassOverrides<C>,
    },
  };
}
