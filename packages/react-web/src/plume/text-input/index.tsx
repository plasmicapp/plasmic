import * as React from "react";
import { omit, pick } from "../../common";
import { Overrides } from "../../render/elements";
import {
  AnyPlasmicClass,
  mergeVariantToggles,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  VariantDef,
} from "../plume-utils";

export interface BaseTextInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "disabled">,
    PlumeTextInputProps {}

export interface PlumeTextInputProps {
  showStartIcon?: boolean;
  showEndIcon?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  isDisabled?: boolean;
  type?: "text" | "password" | "email" | "url" | string;
  inputClassName?: string;
  inputStyle?: React.CSSProperties;
  className?: string;
  style?: React.CSSProperties;
}

export interface TextInputRefValue {
  focus: () => void;
  blur: () => void;
  getRoot: () => HTMLElement | null;
  getInput: () => HTMLInputElement | null;
}

export type TextInputRef = React.Ref<TextInputRefValue>;

interface TextInputConfig<C extends AnyPlasmicClass> {
  showStartIconVariant: VariantDef<PlasmicClassVariants<C>>;
  showEndIconVariant?: VariantDef<PlasmicClassVariants<C>>;
  isDisabledVariant?: VariantDef<PlasmicClassVariants<C>>;
  startIconSlot?: keyof PlasmicClassArgs<C>;
  endIconSlot?: keyof PlasmicClassArgs<C>;
  root: keyof PlasmicClassOverrides<C>;
  input: keyof PlasmicClassOverrides<C>;
}

export function useTextInput<
  P extends PlumeTextInputProps,
  C extends AnyPlasmicClass
>(
  plasmicClass: C,
  props: P,
  config: TextInputConfig<C>,
  ref: TextInputRef = null
) {
  const {
    isDisabled,
    startIcon,
    endIcon,
    showStartIcon,
    showEndIcon,
    className,
    style,
    inputClassName,
    inputStyle,
    ...rest
  } = props;
  const rootRef = React.useRef<HTMLElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useImperativeHandle(
    ref,
    () => ({
      focus() {
        inputRef.current?.focus();
      },
      blur() {
        inputRef.current?.blur();
      },
      getRoot() {
        return rootRef.current;
      },
      getInput() {
        return inputRef.current;
      },
      getBoundingClientRect() {
        return rootRef.current?.getBoundingClientRect();
      },
    }),
    [rootRef, inputRef]
  );

  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantToggles(
      { def: config.showStartIconVariant, active: showStartIcon },
      { def: config.showEndIconVariant, active: showEndIcon },
      { def: config.isDisabledVariant, active: isDisabled }
    ),
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    ...(config.startIconSlot && { [config.startIconSlot]: startIcon }),
    ...(config.endIconSlot && { [config.endIconSlot]: endIcon }),
  };

  const overrides: Overrides = {
    [config.root]: {
      props: {
        ref: rootRef,
        className,
        style,
      },
    },
    [config.input]: {
      props: {
        // We throw all of extra "rest" onto the `input` element, except props
        // that were meant for the Plasmic component -- the args and variants.
        // We make two exceptions though:
        // 1. onChange - Plume text-input is kind of screwy, and the "value" state
        //    of the input element is not exposed to the outer component via the
        //    normal way; instead, we register a separate "value" state that's
        //    in additional to the input.value state. So that means there are
        //    two `onChange` that we need to pipe through -- the one that updates
        //    `$state.input.value`, the input value state internal to the component,
        //    and the one that updates `$state.value`, the separate value state
        //    exposed to the outside. The generated <PlasmicTextInput/> will pass
        //    in the onChange for updating the internal `$state.input.value`, and
        //    props.onChange here will pass in the onChange for updating the
        //    externally exposed `$state.value`. Wow! Very sad.  If
        //    `$state.input.value` were just externally exposed, then we wouldn't
        //    need to do so; but we can't retroactively update people's TextInput
        //    components that have already been forked :-/
        // 2. `required`, because that prop existed prior to Plume pkg <= 19.1.1,
        //    but it was not linked to the input's `required` attribute as it should.
        //    So this again works around older versions of TextInput out there.
        ...omit(
          rest as any,
          ...plasmicClass.internalArgProps.filter(
            (prop) => prop !== "required" && prop !== "onChange"
          ),
          ...plasmicClass.internalVariantProps
        ),
        disabled: isDisabled,
        ref: inputRef,
        className: inputClassName,
        style: inputStyle,
      },
    },
  };

  return {
    plasmicProps: {
      variants: variants as PlasmicClassVariants<C>,
      args: args as PlasmicClassArgs<C>,
      overrides: overrides as PlasmicClassOverrides<C>,
    },
  };
}
