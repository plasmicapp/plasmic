import { Overrides } from '@plasmicapp/react-web';
import { useOption as useAriaOption } from '@react-aria/listbox';
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
import { DOMRef, FocusableRef } from '@react-types/shared';
import { unwrapDOMRef, useFocusableRef } from '@react-spectrum/utils';

export type PlumeSelectOptionProps = {
  itemKey: React.Key;
  children?: React.ReactNode;
};

interface PlumeSelectOptionConfig<R extends AnyRenderer> {
  isSelectedVariant: VariantDefTuple<RendererVariants<R>>;
  isDisabledVariant?: VariantDefTuple<RendererVariants<R>>;

  contentSlot: keyof RendererArgs<R>;

  root: keyof RendererOverrides<R>;
}

export type PlumeSelectOptionRef = FocusableRef<HTMLElement>;

export function useSelectOption<
  P extends PlumeSelectOptionProps,
  R extends AnyRenderer
>(
  plasmicClass: PlasmicClass<R>,
  props: P,
  config: PlumeSelectOptionConfig<R>,
  outerRef: PlumeSelectOptionRef = null
) {
  const { itemKey, children } = props;
  const renderer = plasmicClass.createRenderer();

  const state = React.useContext(SelectContext);
  if (!state) {
    throw new Error(
      'You can only use a PlumeSelectOption within a PlumeSelect component.'
    );
  }

  const item = state.collection.getItem(itemKey);
  const isSelected = state.selectionManager.isSelected(itemKey);
  const isDisabled = state.disabledKeys.has(itemKey);

  const ref = useFocusableRef(outerRef);

  const { optionProps, labelProps, descriptionProps } = useAriaOption(
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
      props: mergeProps(optionProps, { ref }),
    },
  };

  return {
    plumeProps: {
      variants: variants as RendererVariants<R>,
      args: args as RendererArgs<R>,
      overrides: overrides as RendererOverrides<R>,
    },
  };
}
