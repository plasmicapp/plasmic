import { useSlider as useAriaSlider } from '@react-aria/slider';
import { useSliderState } from '@react-stately/slider';
import { SliderProps } from '@react-types/slider';
import { Overrides, Renderer } from '@plasmicapp/react-web';
import { createDOMRef } from '@react-spectrum/utils';
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
import commonStyles from '../common.module.css';
import { SliderContext, SliderContextState } from './context';

export interface PlumeSliderProps extends SliderProps, StyleProps {
  getThumbLabel?: (index: number) => React.ReactNode;
  getThumbAriaLabel?: (index: number) => React.ReactNode;
}

export type PlumeSliderRef = FocusableRef;

export interface PlumeSliderConfig<R extends Renderer<any, any, any, any>> {
  isDisabledVariant?: VariantDefTuple<RendererVariants<R>>;
  hasLabelVariant?: VariantDefTuple<RendererVariants<R>>;

  root: keyof RendererOverrides<R>;
  track: keyof RendererOverrides<R>;
  thumbContainer: keyof RendererOverrides<R>;
  thumbTemplate: keyof RendererOverrides<R>;
  label?: keyof RendererOverrides<R>;
}

export function useSlider<
  P extends PlumeSliderProps,
  R extends AnyRenderer
>(
  plasmicClass: PlasmicClass<R>,
  props: P,
  config: PlumeSliderConfig<R>,
  ref: PlumeSliderRef = null
) {
  const {
    isDisabled,
    className,
    style,
    getThumbAriaLabel,
    getThumbLabel,
  } = props;
  const trackRef = React.useRef<HTMLElement>(null);

  const domRef = React.useRef<HTMLElement>(null);
  React.useImperativeHandle(ref, () => ({
    ...createDOMRef(domRef),
    focus() {
      state.setFocusedThumb(0);
    }
  }));
  const renderer = plasmicClass.createRenderer();
  const state = useSliderState(props);
  const { trackProps, labelProps, containerProps } = useAriaSlider(
    props,
    state,
    trackRef
  );

  const variants = {
    ...pick(props, ...renderer.getInternalVariantProps()),
    ...mergeVariantDefTuples([
      isDisabled && config.isDisabledVariant,
      props.label && config.hasLabelVariant,
    ]),
  } as RendererVariants<R>;

  const context: SliderContextState = {
    state,
    sliderProps: props,
    trackRef,
  };
  const args = {
    ...pick(props, ...renderer.getInternalArgProps()),
  } as RendererArgs<R>;

  const loadedRenderer = renderer.withVariants(variants).withArgs(args);

  const overrides: Overrides = {
    [config.root]: {
      props: mergeProps(containerProps, { className, style, ref: domRef }),
      wrapChildren: (children: React.ReactNode) => (
        <SliderContext.Provider value={context}>
          {children}
        </SliderContext.Provider>
      ),
    },
    [config.track]: {
      props: mergeProps(trackProps, {
        ref: trackRef,
        className: commonStyles.noOutline,
      }),
    },
    [config.thumbContainer]: {
      children: state.values.map((value, index) => (
        <React.Fragment key={index}>
          {loadedRenderer
            .forNode(config.thumbTemplate)
            .withOverrides({
              [config.thumbTemplate]: {
                index,
                ...(getThumbLabel ? { label: getThumbLabel(index) } : {}),
                ...(getThumbAriaLabel
                  ? { 'aria-label': getThumbAriaLabel(index) }
                  : {}),
              },
            })
            .render()}
        </React.Fragment>
      )),
    },
    ...(config.label
      ? {
          [config.label]: {
            as: 'label',
            props: labelProps,
          },
        }
      : {}),
  } as RendererOverrides<R>;

  return {
    plumeProps: {
      variants,
      args,
      overrides,
    },
    state,
  };
}
