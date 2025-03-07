import React, { ChangeEvent, ForwardedRef, useEffect } from "react";
import { mergeProps, useFocusRing, useHover } from "react-aria";
import {
  InputContext,
  type InputProps,
  useContextProps,
} from "react-aria-components";
import { COMMON_STYLES, getCommonProps, resolveAutoComplete } from "./common";
import { PlasmicInputContext, PlasmicTextFieldContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  filterHoverProps,
  HasControlContextData,
  isDefined,
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

function BaseInput_(
  props: BaseInputProps,
  ref: ForwardedRef<HTMLInputElement>
) {
  const {
    plasmicUpdateVariant,
    setControlContextData,
    autoComplete,
    value,
    className,
    ...restProps
  } = props;
  const textFieldContext = React.useContext(PlasmicTextFieldContext);
  const context = React.useContext(PlasmicInputContext);
  const [inputContextProps, inputRef] = useContextProps(
    restProps,
    ref,
    InputContext
  );

  const { hoverProps, isHovered } = useHover(props);
  const { isFocused, isFocusVisible, focusProps } = useFocusRing({
    isTextInput: true,
    autoFocus: inputContextProps.autoFocus,
  });

  const mergedProps = mergeProps(
    filterHoverProps(inputContextProps),
    focusProps,
    hoverProps,
    {
      style: COMMON_STYLES,
      value:
        context?.isUncontrolled || isDefined(textFieldContext)
          ? undefined
          : value,
      autoComplete: resolveAutoComplete(autoComplete),
      className,
    }
  );

  const isDisabled = mergedProps.disabled || false;
  const isInvalid =
    !!mergedProps["aria-invalid"] && mergedProps["aria-invalid"] !== "false";

  setControlContextData?.({
    parent: textFieldContext,
  });

  useEffect(() => {
    if (plasmicUpdateVariant) {
      plasmicUpdateVariant({
        disabled: isDisabled,
        focused: isFocused,
        focusVisible: isFocusVisible,
        hovered: isHovered,
      });
    }
  }, [isFocused, isFocusVisible, isHovered, isDisabled, plasmicUpdateVariant]);

  return (
    <input
      {...mergedProps}
      ref={inputRef}
      data-focused={isFocused || undefined}
      data-disabled={isDisabled || undefined}
      data-hovered={isHovered || undefined}
      data-focus-visible={isFocusVisible || undefined}
      data-invalid={isInvalid || undefined}
    />
  );
}

export const BaseInput = React.forwardRef(BaseInput_);

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
