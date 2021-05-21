import { useHover } from "@react-aria/interactions";
import { useSwitch as useAriaSwitch } from "@react-aria/switch";
import { VisuallyHidden } from "@react-aria/visually-hidden";
import { useToggleState } from "@react-stately/toggle";
import { HoverEvents } from "@react-types/shared";
import { AriaSwitchProps } from "@react-types/switch";
import * as React from "react";
import { pick } from "../../common";
import { mergeProps } from "../../react-utils";
import { Overrides } from "../../render/elements";
import {
  AnyPlasmicClass,
  mergeVariantToggles,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  VariantDef,
} from "../plume-utils";
import { getStyleProps, StyleProps } from "../props-utils";

export type SwitchRef = React.Ref<SwitchRefValue>;
export interface SwitchRefValue extends SwitchState {
  getRoot: () => HTMLElement | null;
  focus: () => void;
  blur: () => void;
}

interface SwitchState {
  setChecked: (checked: boolean) => void;
}

export interface SwitchProps
  extends Omit<AriaSwitchProps, "isSelected" | "defaultSelected">,
    StyleProps,
    HoverEvents {
  /**
   * Whether the Switch is checked or not; controlled
   */
  isChecked?: boolean;

  /**
   * Whether the Switch is checked by default; uncontrolled
   */
  defaultChecked?: boolean;
}

function asAriaSwitchProps(props: SwitchProps) {
  const ariaProps = {
    ...props,
    isSelected: props.isChecked,
    defaultSelected: props.defaultChecked,
  };
  delete ariaProps["isChecked"];
  delete ariaProps["defaultChecked"];
  return ariaProps;
}

interface SwitchConfig<C extends AnyPlasmicClass> {
  isCheckedVariant: VariantDef<PlasmicClassVariants<C>>;
  isDisabledVariant?: VariantDef<PlasmicClassVariants<C>>;
  noLabelVariant?: VariantDef<PlasmicClassVariants<C>>;
  labelSlot?: keyof PlasmicClassArgs<C>;
  root: keyof PlasmicClassOverrides<C>;
}

export function useSwitch<P extends SwitchProps, C extends AnyPlasmicClass>(
  plasmicClass: C,
  props: P,
  config: SwitchConfig<C>,
  ref: SwitchRef = null
) {
  const { children, isDisabled } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const rootRef = React.useRef<HTMLElement>(null);
  const ariaProps = asAriaSwitchProps(props);
  const state = useToggleState(ariaProps);
  const { hoverProps } = useHover(props);
  const { inputProps } = useAriaSwitch(ariaProps, state, inputRef);
  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantToggles(
      {
        def: config.isDisabledVariant,
        active: isDisabled,
      },
      {
        def: config.isCheckedVariant,
        active: state.isSelected,
      },
      {
        def: config.noLabelVariant,
        active: !children,
      }
    ),
  };
  const overrides: Overrides = {
    [config.root]: {
      as: "label",
      props: mergeProps(hoverProps, getStyleProps(props), {
        ref: rootRef,
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
  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    ...(config.labelSlot ? { [config.labelSlot]: children } : {}),
  };

  const plumeState: SwitchState = React.useMemo(
    () => ({
      setChecked: (checked: boolean) => state.setSelected(checked),
    }),
    [state]
  );

  React.useImperativeHandle(
    ref,
    () => ({
      getRoot: () => rootRef.current,
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      setChecked: (checked) => plumeState.setChecked(checked),
    }),
    [rootRef, inputRef, plumeState]
  );

  return {
    plasmicProps: {
      variants: variants as PlasmicClassVariants<C>,
      overrides: overrides as PlasmicClassOverrides<C>,
      args: args as PlasmicClassArgs<C>,
    },
    state: plumeState,
  };
}
