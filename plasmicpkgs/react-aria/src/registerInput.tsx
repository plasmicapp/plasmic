import React, { ChangeEvent, useCallback } from "react";
import { mergeProps } from "react-aria";
import type { InputProps, InputRenderProps } from "react-aria-components";
import { Input } from "react-aria-components";
import { COMMON_STYLES, getCommonProps, resolveAutoComplete } from "./common";
import { PlasmicInputContext, PlasmicTextFieldContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  HasControlContextData,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";
import { pickAriaComponentVariants, WithVariants } from "./variant-utils";

const INPUT_VARIANTS = [
  "focused" as const,
  "focusVisible" as const,
  "hovered" as const,
  "disabled" as const,
];

const { variants } = pickAriaComponentVariants(INPUT_VARIANTS);

export interface BaseInputProps
  extends Omit<InputProps, "autoComplete" | "className">,
    HasControlContextData,
    WithVariants<typeof INPUT_VARIANTS> {
  autoComplete?: string[];
  isUncontrolled?: boolean;
  className?: string;
}

export const inputHelpers = {
  states: {
    value: {
      onChangeArgsToValue: (e: ChangeEvent<HTMLInputElement>) => {
        return e.target.value;
      },
    },
  },
};

export function BaseInput(props: BaseInputProps) {
  const {
    plasmicUpdateVariant,
    setControlContextData,
    autoComplete,
    value,
    className,
    ...rest
  } = props;
  const textFieldContext = React.useContext(PlasmicTextFieldContext);
  const context = React.useContext(PlasmicInputContext);

  setControlContextData?.({
    parent: textFieldContext,
  });

  const classNameProp = useCallback(
    ({
      isDisabled,
      isFocusVisible,
      isFocused,
      isHovered,
    }: InputRenderProps) => {
      plasmicUpdateVariant?.({
        disabled: isDisabled,
        focused: isFocused,
        focusVisible: isFocusVisible,
        hovered: isHovered,
      });
      return className ?? "";
    },
    [className, plasmicUpdateVariant]
  );

  const mergedProps = mergeProps(rest, {
    value: context?.isUncontrolled ? undefined : value,
    autoComplete: resolveAutoComplete(autoComplete),
    className: classNameProp,
  });

  return <Input {...mergedProps} style={COMMON_STYLES} />;
}

export const INPUT_COMPONENT_NAME = makeComponentName("input");

export function registerInput(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseInput>
) {
  registerComponentHelper(
    loader,
    BaseInput,
    {
      name: INPUT_COMPONENT_NAME,
      displayName: "Aria Input",
      importPath: "@plasmicpkgs/react-aria/skinny/registerInput",
      importName: "BaseInput",
      variants,
      defaultStyles: {
        width: "300px",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "black",
        padding: "4px 10px",
      },
      props: {
        ...getCommonProps<BaseInputProps>("Input", [
          "name",
          "disabled",
          "readOnly",
          "autoFocus",
          "aria-label",
          "required",
          "placeholder",
          "value",
          "maxLength",
          "minLength",
          "pattern",
          "type",
          "inputMode",
          "autoComplete",
          "onChange",
          "onFocus",
          "onBlur",
          "onKeyDown",
          "onKeyUp",
          "onCopy",
          "onCut",
          "onPaste",
          "onCompositionStart",
          "onCompositionEnd",
          "onCompositionUpdate",
          "onSelect",
          "onBeforeInput",
          "onInput",
        ]),
      },
      states: {
        value: {
          type: "writable",
          valueProp: "value",
          onChangeProp: "onChange",
          variableType: "text",
          ...inputHelpers.states.value,
        },
      },

      componentHelpers: {
        helpers: inputHelpers,
        importName: "inputHelpers",
        importPath: "@plasmicpkgs/react-aria/skinny/registerInput",
      },
    },
    overrides
  );
}
