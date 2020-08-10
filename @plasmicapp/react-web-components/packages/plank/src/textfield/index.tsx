import * as React from 'react';
import { Renderer, Overrides } from '@plasmicapp/react-web';
import { FocusableRefValue, HoverEvents } from '@react-types/shared';
import {
  VariantDefTuple,
  StyleProps,
  mergeVariantDefTuples,
  mergeProps,
  PlasmicClass,
  RendererArgs,
  RendererOverrides,
  RendererVariants,
} from '../common';
import { AriaTextFieldProps } from '@react-types/textfield';
import { useTextField } from '@react-aria/textfield';
import { createFocusableRef } from '@react-spectrum/utils';
import pick from 'lodash-es/pick';
import commonStyles from '../common.module.css';
import { useHover } from '@react-aria/interactions';

export type PlankTextFieldProps = AriaTextFieldProps &
  StyleProps &
  HoverEvents & {
    selectAllOnFocus?: boolean;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
  };

export interface PlankTextFieldRefValue
  extends FocusableRefValue<HTMLInputElement, HTMLDivElement> {
  select(): void;
  getInputElement(): HTMLInputElement;
}

export type PlankTextFieldRef = React.Ref<PlankTextFieldRefValue>;

export interface PlankTextFieldConfig<R extends Renderer<any, any, any, any>> {
  isDisabledVariant?: VariantDefTuple<RendererVariants<R>>;
  hasLabelVariant?: VariantDefTuple<RendererVariants<R>>;
  showStartIconVariant?: VariantDefTuple<RendererVariants<R>>;
  showEndIconVariant?: VariantDefTuple<RendererVariants<R>>;

  root: keyof RendererOverrides<R>;
  textbox: keyof RendererOverrides<R>;
  label?: keyof RendererOverrides<R>;
}

export function usePlankTextField<
  P extends PlankTextFieldProps,
  R extends Renderer<any, any, any, any>
>(
  plasmicClass: PlasmicClass<R>,
  props: P,
  config: PlankTextFieldConfig<R>,
  ref: PlankTextFieldRef = null
) {
  const renderer = plasmicClass.createRenderer();
  const {
    isDisabled,
    selectAllOnFocus,
    className,
    style,
    startIcon,
    endIcon,
    label,
  } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { labelProps, inputProps } = useTextField(props, inputRef);
  const { hoverProps } = useHover(props);

  const rootRef = React.useRef<HTMLDivElement>(null);

  // Expose imperative interface for ref
  React.useImperativeHandle(ref, () => ({
    ...createFocusableRef(rootRef, inputRef),
    focus() {
      if (inputRef.current) {
        inputRef.current.focus();
        if (selectAllOnFocus) {
          inputRef.current.select();
        }
      }
    },
    select() {
      if (inputRef.current) {
        inputRef.current.select();
      }
    },
    getInputElement() {
      return inputRef.current as HTMLInputElement;
    },
  }));

  const variants = {
    ...pick(props, ...renderer.getInternalVariantProps()),
    ...mergeVariantDefTuples([
      isDisabled && config.isDisabledVariant,
      label && config.hasLabelVariant,
      startIcon && config.showStartIconVariant,
      endIcon && config.showEndIconVariant,
    ]),
  };

  const args = {
    ...pick(props, ...renderer.getInternalArgProps()),
  };

  const overrides: Overrides = {
    [config.root]: mergeProps(hoverProps, {
      ref: rootRef,
      className,
      style,
    }),
    [config.textbox]: {
      ref: inputRef,
      ...mergeProps(inputProps, {
        className: commonStyles.noOutline,
        onFocus: (e: FocusEvent) => {
          if (selectAllOnFocus && inputRef.current) {
            inputRef.current.select();
          }
        },
      }),
    },
    ...(config.label
      ? {
          [config.label]: {
            as: 'label',
            props: {
              ...labelProps,
            },
          },
        }
      : {}),
  };

  return {
    plankProps: {
      variants: variants as RendererVariants<R>,
      args: args as RendererArgs<R>,
      overrides: overrides as RendererOverrides<R>,
    },
  };
}
