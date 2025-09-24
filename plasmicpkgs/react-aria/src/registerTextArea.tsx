import React, { ChangeEvent, ForwardedRef, useEffect } from "react";
import { mergeProps, useFocusRing, useHover } from "react-aria";
import {
  TextAreaContext,
  TextAreaProps,
  useContextProps,
} from "react-aria-components";
import {
  COMMON_STYLES,
  createIdProp,
  createPlaceholderProp,
  commonInputEventHandlerProps,
  createDisabledProp,
  createReadOnlyProp,
  createRequiredProp,
  createNameProp,
  createAutoFocusProp,
  createInitialValueProp,
  createMaxLengthProp,
  createMinLengthProp,
  createInputModeProp,
  createAriaLabelProp,
} from "./common";
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
  autoResize?: boolean;
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
    autoResize,
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
        ...(autoResize
          ? { resize: "none" } // Auto-resize disables manual resizing
          : resize
          ? { resize }
          : {}),
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

  React.useEffect(() => {
    const el = textAreaRef.current;
    if (autoResize && el) {
      // Reset height to allow shrinking when text is deleted
      el.style.height = "auto";
      // Then set to scrollHeight so it expands to fit new content
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [mergedProps.value]);

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
        // Keep id first in the editor
        id: createIdProp("Text Area"),

        // Non-event props (explicit to preserve ordering)
        name: createNameProp(),
        placeholder: createPlaceholderProp(),
        value: createInitialValueProp("Text Area"),
        autoFocus: createAutoFocusProp("Text Area"),
        disabled: createDisabledProp("Text Area"),
        readOnly: createReadOnlyProp("Text Area"),
        required: createRequiredProp("Text Area"),
        maxLength: createMaxLengthProp(),
        minLength: createMinLengthProp(),
        inputMode: createInputModeProp(),
        autoResize: {
          type: "boolean",
          displayName: "Auto resize",
          defaultValueHint: false,
          description:
            "Grows or shrinks the element automatically based on text content. Disables manual resizing.",
        },
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
          hidden: (props) => Boolean(props.autoResize),
          advanced: true,
        },

        // Accessibility
        "aria-label": createAriaLabelProp("Text Area"),

        // Common event handlers appended last
        ...commonInputEventHandlerProps<BaseTextAreaProps>(),
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
