import { useSliderThumb } from '@chungwu/react-aria-slider';
import { SliderThumbProps } from '@chungwu/react-types-slider';
import { Overrides } from '@plasmicapp/react-web';
import { VisuallyHidden } from '@react-aria/visually-hidden';
import { useFocusableRef } from '@react-spectrum/utils';
import { FocusableRef } from '@react-types/shared';
import pick from 'lodash-es/pick';
import * as React from 'react';
import {
  AnyRenderer,
  mergeProps,
  mergeVariantDefTuples,
  PlasmicClass,
  RendererArgs,
  RendererOverrides,
  RendererVariants,
  StyleProps,
  VariantDefTuple,
} from '../common';
import { useSliderContext } from './context';

export type PlumeSliderThumbProps = SliderThumbProps & StyleProps;

export type PlumeSliderThumbRef = FocusableRef;

export interface PlumeSliderThumbConfig<R extends AnyRenderer> {
  isDisabledVariant?: VariantDefTuple<RendererVariants<R>>;
  isDraggingVariant?: VariantDefTuple<RendererVariants<R>>;
  hasLabelVariant?: VariantDefTuple<RendererVariants<R>>;

  root: keyof RendererOverrides<R>;
  label?: keyof RendererOverrides<R>;
}

export function usePlumeSliderThumb<
  P extends PlumeSliderThumbProps,
  R extends AnyRenderer
>(
  plasmicClass: PlasmicClass<R>,
  props: P,
  config: PlumeSliderThumbConfig<R>,
  ref: PlumeSliderThumbRef = null
) {
  const { className, style, isDisabled, index } = props;
  const context = useSliderContext();
  const renderer = plasmicClass.createRenderer();
  const domRef = useFocusableRef(ref);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const state = context.state;
  const { thumbProps, inputProps, labelProps } = useSliderThumb(
    {
      ...props,
      isReadOnly: context.sliderProps.isReadOnly || props.isReadOnly,
      isDisabled: context.sliderProps.isDisabled || props.isDisabled,
      inputRef: inputRef,
      trackRef: context.trackRef,
    },
    state
  );

  const overrides: Overrides = {
    [config.root]: {
      props: mergeProps(
        thumbProps,
        {
          style: {
            position: 'absolute',
            transform: `translateX(-50%)`,
            left: `${state.getThumbPercent(index) * 100}%`,
          },
          ref: domRef,
        },
        {
          className,
          style,
        }
      ),
      wrapChildren: (children) => (
        <>
          <VisuallyHidden isFocusable>
            <input {...mergeProps(inputProps, { ref: inputRef })} />
          </VisuallyHidden>
          {children}
        </>
      ),
    },
    ...(config.label
      ? {
          [config.label]: {
            as: 'label',
            props: labelProps,
          },
        }
      : {}),
  };

  return {
    plumeProps: {
      variants: {
        ...pick(props, ...renderer.getInternalVariantProps()),
        ...mergeVariantDefTuples([
          (isDisabled || context.sliderProps.isDisabled) &&
            config.isDisabledVariant,
          state.isThumbDragging(index) && config.isDraggingVariant,
          props.label && config.hasLabelVariant,
        ]),
      } as RendererVariants<R>,
      args: {
        ...pick(props, ...renderer.getInternalArgProps()),
      } as RendererArgs<R>,
      overrides: overrides as RendererOverrides<R>,
    },
    state,
  };
}
