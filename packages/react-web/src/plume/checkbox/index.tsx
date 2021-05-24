import { useCheckbox as useAriaCheckbox } from "@react-aria/checkbox";
import { VisuallyHidden } from "@react-aria/visually-hidden";
import { useToggleState } from "@react-stately/toggle";
import { AriaCheckboxProps } from "@react-types/checkbox";
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

export type CheckboxRef = React.Ref<CheckboxRefValue>;
export interface CheckboxRefValue extends CheckboxState {
  getRoot: () => HTMLElement | null;
  focus: () => void;
  blur: () => void;
}

interface CheckboxState {
  setChecked: (checked: boolean) => void;
}

export interface CheckboxProps
  extends Omit<AriaCheckboxProps, "isSelected" | "defaultSelected">,
    StyleProps {
  /**
   * Whether the Checkbox is checked or not; controlled
   */
  isChecked?: boolean;

  /**
   * Whether the Checkbox is checked by default; uncontrolled
   */
  defaultChecked?: boolean;

  /**
   * Whether the Checkbox is in an "indeterminate" state; this usually
   * refers to a "check all" that is used to check / uncheck many other
   * checkboxes, and is visually indeterminate if some of its controlled
   * checkboxes are checked and some are not.
   */
  isIndeterminate?: boolean;
}

function asAriaCheckboxProps(props: CheckboxProps) {
  const ariaProps = {
    ...props,
    isSelected: props.isChecked,
    defaultSelected: props.defaultChecked,
  };
  delete ariaProps["isChecked"];
  delete ariaProps["defaultChecked"];
  return ariaProps;
}

interface CheckboxConfig<C extends AnyPlasmicClass> {
  isCheckedVariant: VariantDef<PlasmicClassVariants<C>>;
  isIndeterminateVariant?: VariantDef<PlasmicClassVariants<C>>;
  isDisabledVariant?: VariantDef<PlasmicClassVariants<C>>;
  noLabelVariant?: VariantDef<PlasmicClassVariants<C>>;
  labelSlot?: keyof PlasmicClassArgs<C>;
  root: keyof PlasmicClassOverrides<C>;
}

export function useCheckbox<P extends CheckboxProps, C extends AnyPlasmicClass>(
  plasmicClass: C,
  props: P,
  config: CheckboxConfig<C>,
  ref: CheckboxRef = null
) {
  const { children, isDisabled, isIndeterminate } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const rootRef = React.useRef<HTMLElement>(null);
  const ariaProps = asAriaCheckboxProps(props);
  const state = useToggleState(ariaProps);
  const { inputProps } = useAriaCheckbox(ariaProps, state, inputRef);
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
        def: config.isIndeterminateVariant,
        active: isIndeterminate,
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
      props: mergeProps(getStyleProps(props), {
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

  const plumeState: CheckboxState = React.useMemo(
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
