import { useCheckbox as useAriaCheckbox } from "@react-aria/checkbox";
import { useHover } from "@react-aria/interactions";
import { VisuallyHidden } from "@react-aria/visually-hidden";
import { useFocusableRef } from "@react-spectrum/utils";
import { useToggleState } from "@react-stately/toggle";
import { AriaCheckboxProps } from "@react-types/checkbox";
import { FocusableRef, HoverEvents } from "@react-types/shared";
import * as React from "react";
import { mergeProps, pick } from "../../common";
import { Overrides } from "../../render/elements";
import {
  AnyPlasmicClass,
  mergeVariantToggles,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  StyleProps,
  VariantDef
} from "../plume-utils";

export type CheckboxRef = FocusableRef<HTMLLabelElement>;

export interface CheckboxProps
  extends Omit<AriaCheckboxProps, "selected" | "defaultSelected">,
    StyleProps,
    HoverEvents {
  isChecked?: boolean;
  defaultChecked?: boolean;
}

function asAriaCheckboxProps(props: CheckboxProps) {
  const ariaProps = {
    ...props,
    isSelected: props.isChecked,
    defaultSelected: props.defaultChecked
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
  const { children, className, isDisabled, isIndeterminate, style } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const domRef = useFocusableRef(ref, inputRef);
  const ariaProps = asAriaCheckboxProps(props);
  const state = useToggleState(ariaProps);
  const { hoverProps } = useHover(props);
  const { inputProps } = useAriaCheckbox(ariaProps, state, inputRef);
  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantToggles(
      {
        def: config.isDisabledVariant,
        active: isDisabled
      },
      {
        def: config.isCheckedVariant,
        active: state.isSelected
      },
      {
        def: config.isIndeterminateVariant,
        active: isIndeterminate
      },
      {
        def: config.noLabelVariant,
        active: !children
      }
    )
  };
  const overrides: Overrides = {
    [config.root]: {
      as: "label",
      props: mergeProps(hoverProps, {
        ref: domRef,
        className,
        style
      }),
      wrapChildren: children => (
        <>
          <VisuallyHidden isFocusable>
            <input {...inputProps} ref={inputRef} />
          </VisuallyHidden>
          {children}
        </>
      )
    }
  };
  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    ...(config.labelSlot ? { [config.labelSlot]: children } : {})
  };
  return {
    plasmicProps: {
      variants: variants as PlasmicClassVariants<C>,
      overrides: overrides as PlasmicClassOverrides<C>,
      args: args as PlasmicClassArgs<C>
    },
    state
  };
}
