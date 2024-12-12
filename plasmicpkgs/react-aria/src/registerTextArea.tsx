import React, { ChangeEvent, useCallback } from "react";
import { mergeProps } from "react-aria";
import type { InputRenderProps, TextAreaProps } from "react-aria-components";
import { TextArea } from "react-aria-components";
import { COMMON_STYLES, getCommonProps } from "./common";
import { PlasmicTextFieldContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  HasControlContextData,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";
import { pickAriaComponentVariants, WithVariants } from "./variant-utils";

const TEXTAREA_VARIANTS = [
  "focused" as const,
  "focusVisible" as const,
  "hovered" as const,
  "disabled" as const,
];

const { variants } = pickAriaComponentVariants(TEXTAREA_VARIANTS);

export interface BaseTextAreaProps
  extends Omit<TextAreaProps, "className">,
    HasControlContextData,
    WithVariants<typeof TEXTAREA_VARIANTS> {
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

export function BaseTextArea(props: BaseTextAreaProps) {
  const { className, plasmicUpdateVariant, setControlContextData, ...rest } =
    props;

  const textFieldContext = React.useContext(PlasmicTextFieldContext);

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
    className: classNameProp,
  });

  return <TextArea {...mergedProps} style={COMMON_STYLES} />;
}

export function registerTextArea(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseTextArea>
) {
  registerComponentHelper(
    loader,
    BaseTextArea,
    {
      name: makeComponentName("textarea"),
      displayName: "Aria TextArea",
      importPath: "@plasmicpkgs/react-aria/skinny/registerTextArea",
      importName: "BaseTextArea",
      variants,
      props: {
        ...getCommonProps<BaseTextAreaProps>("Text Area", [
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
          "inputMode",
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
        importPath: "@plasmicpkgs/react-aria/skinny/registerTextArea",
      },
    },
    overrides
  );
}
