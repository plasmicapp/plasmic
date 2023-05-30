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
        ...omit(
          rest as any,
          // We need to remove `required` from the list of internalArgProps to
          // be omitted in the props being passed through because Plume pkg
          // <= 19.1.1 had a bug: input[required] was not linked to the
          // `required` arg as it should.
          ...plasmicClass.internalArgProps.filter(
            (prop) => prop !== "required"
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
