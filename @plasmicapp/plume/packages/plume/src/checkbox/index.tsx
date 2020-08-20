import { Overrides, Renderer } from '@plasmicapp/react-web';
import { useCheckbox } from '@react-aria/checkbox';
import { useHover } from '@react-aria/interactions';
import { VisuallyHidden } from '@react-aria/visually-hidden';
import { useFocusableRef } from '@react-spectrum/utils';
import { useToggleState } from '@react-stately/toggle';
import { AriaCheckboxProps } from '@react-types/checkbox';
import { FocusableRef, HoverEvents } from '@react-types/shared';
import pick from 'lodash-es/pick';
import * as React from 'react';
import {
  mergeProps,
  mergeVariantDefTuples,
  PlasmicClass,
  RendererArgs,
  RendererOverrides,
  RendererVariants,
  StyleProps,
  VariantDefTuple,
} from '../common';

export type PlumeCheckboxRef = FocusableRef<HTMLLabelElement>;

export type PlumeCheckboxProps = AriaCheckboxProps & StyleProps & HoverEvents;

interface PlumeCheckboxConfig<R extends Renderer<any, any, any, any>> {
  isSelectedVariant: VariantDefTuple<RendererVariants<R>>;
  isIndeterminateVariant?: VariantDefTuple<RendererVariants<R>>;
  isDisabledVariant?: VariantDefTuple<RendererVariants<R>>;
  hasLabelVariant?: VariantDefTuple<RendererVariants<R>>;

  root: keyof RendererOverrides<R>;
}

export function usePlumeCheckbox<
  P extends PlumeCheckboxProps,
  R extends Renderer<any, any, any, any>
>(
  plasmicClass: PlasmicClass<R>,
  props: P,
  config: PlumeCheckboxConfig<R>,
  ref: PlumeCheckboxRef = null
) {
  const { isDisabled, children, isIndeterminate, className, style } = props;

  const renderer = plasmicClass.createRenderer();

  const inputRef = React.useRef<HTMLInputElement>(null);
  const domRef = useFocusableRef(ref, inputRef);
  const state = useToggleState(props);
  const { hoverProps } = useHover(props);

  const { inputProps } = useCheckbox(props, state, inputRef);

  const variants = {
    ...pick(props, ...renderer.getInternalVariantProps()),
    ...mergeVariantDefTuples([
      state.isSelected && config.isSelectedVariant,
      isIndeterminate && config.isIndeterminateVariant,
      isDisabled && config.isDisabledVariant,
      !!children && config.hasLabelVariant,
    ]),
  };
  const overrides: Overrides = {
    [config.root ?? 'root']: {
      as: 'label',
      props: mergeProps(hoverProps, {
        ref: domRef,
        className,
        style,
      }),
      wrapChildren: (children) => (
        <>
          <VisuallyHidden isFocusable>
            <input {...inputProps} ref={inputRef} />
          </VisuallyHidden>
          {children}
        </>
      ),
    },
  };
  return {
    plumeProps: {
      variants: variants as RendererVariants<R>,
      overrides: overrides as RendererOverrides<R>,
      args: pick(props, ...renderer.getInternalArgProps()) as RendererArgs<R>,
    },
    state,
  };
}
