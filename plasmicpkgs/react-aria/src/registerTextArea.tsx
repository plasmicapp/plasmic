import React, { ChangeEvent, useEffect } from "react";
import { mergeProps } from "react-aria";
import type { TextAreaProps } from "react-aria-components";
import { TextArea } from "react-aria-components";
import { getCommonProps } from "./common";
import { PlasmicTextFieldContext } from "./contexts";
import {
  pickAriaComponentVariants,
  UpdateInteractionVariant,
} from "./interaction-variant-utils";
import {
  CodeComponentMetaOverrides,
  HasControlContextData,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

const TEXTAREA_INTERACTION_VARIANTS = [
  "focused" as const,
  "hovered" as const,
  "disabled" as const,
];

const { interactionVariants } = pickAriaComponentVariants(
  TEXTAREA_INTERACTION_VARIANTS
);

export interface BaseTextAreaProps
  extends TextAreaProps,
    HasControlContextData {
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof TEXTAREA_INTERACTION_VARIANTS
  >;
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
  const { disabled, updateInteractionVariant, setControlContextData, ...rest } =
    props;

  const textFieldContext = React.useContext(PlasmicTextFieldContext);

  const mergedProps = mergeProps(rest, {
    disabled: textFieldContext?.isDisabled ?? disabled,
  });

  // NOTE: Aria <Input> does not support render props, neither does it provide an onDisabledChange event, so we have to manually update the disabled state
  useEffect(() => {
    updateInteractionVariant?.({
      disabled: mergedProps.disabled,
    });
  }, [mergedProps.disabled, updateInteractionVariant]);

  setControlContextData?.({
    parent: textFieldContext,
  });

  return (
    <TextArea
      onFocus={() => {
        updateInteractionVariant?.({
          focused: true,
        });
      }}
      onBlur={() => {
        updateInteractionVariant?.({
          focused: false,
        });
      }}
      onHoverChange={(isHovered) => {
        updateInteractionVariant?.({
          hovered: isHovered,
        });
      }}
      {...mergedProps}
    />
  );
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
      interactionVariants,
      props: {
        ...getCommonProps<TextAreaProps>("Text Area", [
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
      trapsFocus: true,
    },
    overrides
  );
}
