import * as React from 'react';
import { Renderer, Overrides } from '@plasmicapp/react-web';
import { useToggleState } from '@react-stately/toggle';
import { AriaSwitchProps } from '@react-types/switch';
import { useSwitch } from '@react-aria/switch';
import { VisuallyHidden } from '@react-aria/visually-hidden';
import { FocusableRef, HoverEvents } from '@react-types/shared';
import { useFocusableRef } from '@react-spectrum/utils';
import { useHover } from '@react-aria/interactions';
import pick from 'lodash-es/pick';
import {
  StyleProps,
  RendererVariants,
  VariantDefTuple,
  mergeVariantDefTuples,
  RendererArgs,
  mergeProps,
  PlasmicClass,
  RendererOverrides,
  AnyRenderer,
} from '../common';

export type PlumeSwitchRef = FocusableRef<HTMLLabelElement>;

export type PlumeSwitchProps = AriaSwitchProps & StyleProps & HoverEvents;

interface PlumeSwitchConfig<R extends AnyRenderer> {
  isSelectedVariant: VariantDefTuple<RendererVariants<R>>;
  isDisabledVariant?: VariantDefTuple<RendererVariants<R>>;
  hasLabelVariant?: VariantDefTuple<RendererVariants<R>>;

  root: keyof RendererOverrides<R>;
}

export function usePlumeSwitch<
  P extends PlumeSwitchProps,
  R extends AnyRenderer
>(
  plasmicClass: PlasmicClass<R>,
  props: P,
  config: PlumeSwitchConfig<R>,
  ref: PlumeSwitchRef = null
) {
  const { isDisabled, children, className, style } = props;
  const renderer = plasmicClass.createRenderer();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const domRef = useFocusableRef(ref, inputRef);
  const state = useToggleState(props);

  const { inputProps } = useSwitch(props, state, inputRef);
  const { hoverProps } = useHover(props);

  const variants = {
    ...pick(props, ...renderer.getInternalVariantProps()),
    ...mergeVariantDefTuples([
      state.isSelected && config.isSelectedVariant,
      isDisabled && config.isDisabledVariant,
      !!children && config.hasLabelVariant,
    ]),
  };

  const overrides: Overrides = {
    [config.root ?? 'root']: {
      as: 'label',
      props: mergeProps(hoverProps, {
        className,
        style,
        ref: domRef,
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
