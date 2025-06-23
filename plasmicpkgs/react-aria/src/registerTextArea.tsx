import React, { ChangeEvent, ForwardedRef, useEffect } from "react";
import { mergeProps, useFocusRing, useHover } from "react-aria";
import {
  TextAreaContext,
  TextAreaProps,
  useContextProps,
} from "react-aria-components";
import { COMMON_STYLES, getCommonProps } from "./common";
import { PlasmicTextFieldContext } from "./contexts";
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
  resize?: string;
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

function BaseTextArea_(
  props: BaseTextAreaProps,
  ref: ForwardedRef<HTMLTextAreaElement>
) {
  const {
    className,
    plasmicUpdateVariant,
    setControlContextData,
    value,
    resize,
    ...restProps
  } = props;

  const textFieldContext = React.useContext(PlasmicTextFieldContext);
  const [textAreaContextProps, textAreaRef] = useContextProps(
    restProps,
    ref,
    TextAreaContext
  );

  const { hoverProps, isHovered } = useHover(textAreaContextProps);
  const { isFocused, isFocusVisible, focusProps } = useFocusRing({
    isTextInput: true,
    autoFocus: textAreaContextProps.autoFocus,
  });

  const mergedProps = mergeProps(
    filterHoverProps(textAreaContextProps),
    focusProps,
    hoverProps,
    {
      value: isDefined(textFieldContext) ? undefined : value,
      style: {
        ...COMMON_STYLES,
        ...(resize ? { resize } : {}),
      },
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
    <textarea
      {...mergedProps}
      ref={textAreaRef}
      data-focused={isFocused || undefined}
      data-disabled={isDisabled || undefined}
      data-hovered={isHovered || undefined}
      data-focus-visible={isFocusVisible || undefined}
      data-invalid={isInvalid || undefined}
    />
  );
}

export const BaseTextArea = React.forwardRef(BaseTextArea_);

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
        resize: {
          type: "choice",
          description: "Controls if and how the element can be resized.",
          options: [
            "both",
            "horizontal",
            "vertical",
            "block",
            "inline",
            "none",
          ],
          defaultValueHint: "both",
        },
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
