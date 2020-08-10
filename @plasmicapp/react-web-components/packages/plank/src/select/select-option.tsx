import { Overrides } from '@plasmicapp/react-web';
import { useOption } from '@react-aria/listbox';
import {
  AnyRenderer,
  mergeProps,
  mergeVariantDefTuples,
  PlasmicClass,
  RendererArgs,
  RendererOverrides,
  RendererVariants,
  useForwardedRef,
  VariantDefTuple,
} from '../common';
import pick from 'lodash-es/pick';
import * as React from 'react';
import { SelectContext } from './context';

export type PlankSelectOptionProps = {
  itemKey: React.Key;
  children?: React.ReactNode;
};

interface PlankSelectOptionConfig<R extends AnyRenderer> {
  isSelectedVariant: VariantDefTuple<RendererVariants<R>>;
  isDisabledVariant?: VariantDefTuple<RendererVariants<R>>;

  contentSlot: keyof RendererArgs<R>;

  root: keyof RendererOverrides<R>;
}

export type PlankSelectOptionRef = React.Ref<HTMLElement>;

export function usePlankSelectOption<
  P extends PlankSelectOptionProps,
  R extends AnyRenderer
>(
  plasmicClass: PlasmicClass<R>,
  props: P,
  config: PlankSelectOptionConfig<R>,
  outerRef: PlankSelectOptionRef = null
) {
  const { itemKey, children } = props;
  const renderer = plasmicClass.createRenderer();

  const state = React.useContext(SelectContext);
  if (!state) {
    throw new Error(
      'You can only use a PlankSelectOption within a PlankSelect component.'
    );
  }

  const item = state.collection.getItem(itemKey);
  const isSelected = state.selectionManager.isSelected(itemKey);
  const isDisabled = state.disabledKeys.has(itemKey);

  const { ref, onRef } = useForwardedRef(outerRef);

  const { optionProps, labelProps, descriptionProps } = useOption(
    {
      isSelected,
      isDisabled,
      'aria-label': item && item['aria-label'],
      key: itemKey,
      shouldSelectOnPressUp: true,
      shouldFocusOnHover: true,
      isVirtualized: false,
    },
    state,
    ref
  );

  const variants = {
    ...pick(props, ...renderer.getInternalVariantProps()),
    ...mergeVariantDefTuples([
      isSelected && config.isSelectedVariant,
      isDisabled && config.isDisabledVariant,
    ]),
  };

  const args = {
    ...pick(props, ...renderer.getInternalArgProps()),
    [config.contentSlot]: children,
  };

  const overrides: Overrides = {
    [config.root]: {
      props: mergeProps(optionProps, { ref: onRef }),
    },
  };

  return {
    plankProps: {
      variants: variants as RendererVariants<R>,
      args: args as RendererArgs<R>,
      overrides: overrides as RendererOverrides<R>,
    },
  };
}
