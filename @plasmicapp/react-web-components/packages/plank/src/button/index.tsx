import { Overrides } from '@plasmicapp/react-web';
import * as React from 'react';
import { useButton } from '@react-aria/button';
import { useHover } from '@react-aria/interactions';
import { FocusableRef, HoverEvents } from '@react-types/shared';
import { useFocusableRef } from '@react-spectrum/utils';
import pick from 'lodash-es/pick';
import { AriaButtonProps } from '@react-types/button';
import {
  mergeProps,
  VariantDefTuple,
  mergeVariantDefTuples,
  AnyRenderer,
  PlasmicClass,
  RendererArgs,
  RendererOverrides,
  StyleProps,
  RendererVariants,
} from '../common';

export type PlankButtonProps = Omit<AriaButtonProps, 'elementType' | 'type'> &
  HoverEvents &
  StyleProps & {
    as?: React.ElementType;
    htmlType?: AriaButtonProps['type'];
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
  };

export type PlankButtonRef = FocusableRef<HTMLButtonElement>;

interface PlankButtonConfig<R extends AnyRenderer> {
  isDisabledVariant?: VariantDefTuple<RendererVariants<R>>;
  showStartIconVariant?: VariantDefTuple<RendererVariants<R>>;
  showEndIconVariant?: VariantDefTuple<RendererVariants<R>>;

  root: keyof RendererOverrides<R>;
}

export function usePlankButton<
  P extends PlankButtonProps,
  R extends AnyRenderer
>(
  plasmicClass: PlasmicClass<R>,
  props: P,
  config: PlankButtonConfig<R>,
  ref: PlankButtonRef = null
) {
  const {
    htmlType,
    as,
    isDisabled,
    startIcon,
    endIcon,
    className,
    style,
  } = props;
  const renderer = plasmicClass.createRenderer();
  const domRef = useFocusableRef(ref);

  const { hoverProps } = useHover(props);
  const { buttonProps } = useButton(
    {
      // Rename deviations we've made from AriaButtonProps
      ...props,
      type: htmlType,
      elementType: as,
    },
    domRef
  );

  const overrides: Overrides = {
    [config.root]: {
      as,
      props: mergeProps(buttonProps, hoverProps, {
        ref: domRef,
        className,
        style,
      }),
    },
  };

  return {
    plankProps: {
      variants: {
        ...pick(props, ...renderer.getInternalVariantProps()),
        ...mergeVariantDefTuples([
          isDisabled && config.isDisabledVariant,
          startIcon && config.showStartIconVariant,
          endIcon && config.showEndIconVariant,
        ]),
      } as RendererVariants<R>,
      args: {
        ...pick(props, ...renderer.getInternalArgProps()),
      } as RendererArgs<R>,
      overrides: overrides as RendererOverrides<R>,
    },
  };
}
