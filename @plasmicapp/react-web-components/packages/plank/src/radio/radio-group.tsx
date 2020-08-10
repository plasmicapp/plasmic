import { useRadioGroup } from '@react-aria/radio';
import { mergeProps } from '@react-aria/utils';
import { useRadioGroupState } from '@react-stately/radio';
import { AriaRadioGroupProps } from '@react-types/radio';
import pick from 'lodash-es/pick';
import * as React from 'react';
import {
  mergeVariantDefTuples,
  PlasmicClass,
  RendererArgs,
  RendererOverrides,
  StyleProps,
  VariantDefTuple,
  AnyRenderer,
  RendererVariants,
} from '../common';
import { RadioGroupContext } from './context';
import { Overrides } from '@plasmicapp/react-web';

export type PlankRadioGroupProps = AriaRadioGroupProps &
  StyleProps & {
    /**
     * The Radio(s) contained within the RadioGroup.
     */
    children: React.ReactNode;
  };

interface PlankRadioGroupConfig<R extends AnyRenderer> {
  isHorizontalVariant?: VariantDefTuple<RendererVariants<R>>;
  isDisabledVariant?: VariantDefTuple<RendererVariants<R>>;
  hasLabelVariant?: VariantDefTuple<RendererVariants<R>>;
  root: keyof RendererOverrides<R>;
  label?: keyof RendererOverrides<R>;
}

export type PlankRadioGroupRef = React.Ref<HTMLDivElement>;

export function usePlankRadioGroup<
  P extends PlankRadioGroupProps,
  R extends AnyRenderer
>(
  plasmicClass: PlasmicClass<R>,
  props: P,
  config: PlankRadioGroupConfig<R>,
  outerRef: PlankRadioGroupRef = null
) {
  const renderer = plasmicClass.createRenderer();
  const { className, style, orientation, isDisabled, isReadOnly } = props;
  const state = useRadioGroupState(props);
  const { radioGroupProps, labelProps } = useRadioGroup(props, state);

  const overrides: Overrides = {
    [config.root]: {
      wrap: (node) => (
        <RadioGroupContext.Provider value={{ isDisabled, isReadOnly, state }}>
          {node}
        </RadioGroupContext.Provider>
      ),
      props: mergeProps(radioGroupProps, {
        ref: outerRef,
        className,
        style,
      }),
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
    plankProps: {
      variants: {
        ...pick(props, ...renderer.getInternalVariantProps()),
        ...mergeVariantDefTuples([
          orientation === 'horizontal' && config.isHorizontalVariant,
          isDisabled && config.isDisabledVariant,
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
