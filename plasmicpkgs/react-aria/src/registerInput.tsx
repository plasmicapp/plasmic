import React, { ChangeEvent, useEffect } from "react";
import { mergeProps } from "react-aria";
import type { InputProps } from "react-aria-components";
import { Input } from "react-aria-components";
import { getCommonProps, resolveAutoComplete } from "./common";
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

const INPUT_INTERACTION_VARIANTS = [
  "focused" as const,
  "hovered" as const,
  "disabled" as const,
];

const { interactionVariants } = pickAriaComponentVariants(
  INPUT_INTERACTION_VARIANTS
);

export interface BaseInputProps
  extends Omit<InputProps, "autoComplete">,
    HasControlContextData {
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof INPUT_INTERACTION_VARIANTS
  >;
  autoComplete?: string[];
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
    updateInteractionVariant,
    setControlContextData,
    disabled,
    autoComplete,
    ...rest
  } = props;
  const textFieldContext = React.useContext(PlasmicTextFieldContext);

  setControlContextData?.({
    parent: textFieldContext,
  });

  const mergedProps = mergeProps(rest, {
    /**
     * While react-aria internally does the merging of the disabled prop,
     * we need to explicity do it here, because react-aria does it behind the scenes,
     * whereas we need the calculated value of the disabled prop to be able to update the "disabled" interaction variant.
     *  */
    disabled: textFieldContext?.isDisabled ?? disabled,
  });

  // NOTE: Aria <Input> does not support render props, neither does it provide an onDisabledChange event, so we have to manually update the disabled state
  useEffect(() => {
    updateInteractionVariant?.({
      disabled: mergedProps.disabled,
    });
  }, [mergedProps.disabled, updateInteractionVariant]);

  return (
    <Input
      autoComplete={resolveAutoComplete(autoComplete)}
      onHoverChange={(isHovered) => {
        updateInteractionVariant?.({
          hovered: isHovered,
        });
      }}
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
      {...mergedProps}
    />
  );
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
      interactionVariants,
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
      trapsFocus: true,
    },
    overrides
  );
}
