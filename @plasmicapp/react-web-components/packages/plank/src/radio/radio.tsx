import { Overrides, Renderer } from '@plasmicapp/react-web';
import { useRadio } from '@react-aria/radio';
import { mergeProps } from '@react-aria/utils';
import { VisuallyHidden } from '@react-aria/visually-hidden';
import { useFocusableRef } from '@react-spectrum/utils';
import { AriaRadioProps } from '@react-types/radio';
import { FocusableRef } from '@react-types/shared';
import pick from 'lodash-es/pick';
import * as React from 'react';
import {
  mergeVariantDefTuples,
  PlasmicClass,
  RendererArgs,
  RendererOverrides,
  StyleProps,
  VariantDefTuple,
  RendererVariants,
} from '../common';
import { useRadioGroupContext } from './context';

export type PlankRadioProps = AriaRadioProps & StyleProps & {};

interface PlankRadioConfig<R extends Renderer<any, any, any, any>> {
  isSelectedVariant: VariantDefTuple<RendererVariants<R>>;
  isDisabledVariant?: VariantDefTuple<RendererVariants<R>>;
  hasLabelVariant?: VariantDefTuple<RendererVariants<R>>;

  root: keyof RendererOverrides<R>;
}

export type PlankRadioRef = FocusableRef<HTMLLabelElement>;
export function usePlankRadio<
  P extends PlankRadioProps,
  R extends Renderer<any, any, any, any>
>(
  plasmicClass: PlasmicClass<R>,
  props: P,
  config: PlankRadioConfig<R>,
  ref: PlankRadioRef = null
) {
  const { isDisabled, className, style, children } = props;
  const renderer = plasmicClass.createRenderer();

  const inputRef = React.useRef<HTMLInputElement>(null);
  const domRef = useFocusableRef(ref, inputRef);
  const {
    state,
    isDisabled: isGroupDisabled,
    isReadOnly: isGroupReadOnly,
  } = useRadioGroupContext();

  const { inputProps } = useRadio(
    {
      ...props,
      isDisabled: isDisabled || isGroupDisabled,
      isReadOnly: isGroupReadOnly,
    },
    state,
    inputRef
  );

  const overrides: Overrides = {
    [config.root]: {
      as: 'label',
      props: {
        ref: domRef,
        className,
        style,
      },
      wrapChildren: (children) => (
        <>
          <VisuallyHidden isFocusable>
            <input {...mergeProps(inputProps, { ref: inputRef })} />
          </VisuallyHidden>
          {children}
        </>
      ),
    },
  };

  return {
    plankProps: {
      variants: {
        ...pick(props, ...renderer.getInternalVariantProps()),
        ...mergeVariantDefTuples([
          inputProps.checked && config.isSelectedVariant,
          (isDisabled || isGroupDisabled) && config.isDisabledVariant,
          !!children && config.hasLabelVariant,
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
