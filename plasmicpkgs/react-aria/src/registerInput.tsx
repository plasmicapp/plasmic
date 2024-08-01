import React, { useEffect } from "react";
import { mergeProps } from "react-aria";
import type { InputProps } from "react-aria-components";
import { Input } from "react-aria-components";
import { PlasmicTextFieldContext } from "./contexts";
import {
  pickAriaComponentVariants,
  UpdateInteractionVariant,
} from "./interaction-variant-utils";
import {
  BaseControlContextData,
  CodeComponentMetaOverrides,
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

export interface BaseInputProps extends InputProps {
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof INPUT_INTERACTION_VARIANTS
  >;
  setControlContextData?: (ctxData: BaseControlContextData) => void;
}

export function BaseInput(props: BaseInputProps) {
  const context = React.useContext(PlasmicTextFieldContext);
  const isStandalone = !context;
  const { updateInteractionVariant, setControlContextData, disabled, ...rest } =
    props;

  const mergedProps = mergeProps(rest, {
    disabled: context?.isDisabled ?? disabled,
  });

  // NOTE: Aria <Input> does not support render props, neither does it provide an onDisabledChange event, so we have to manually update the disabled state
  useEffect(() => {
    updateInteractionVariant?.({
      disabled: mergedProps.disabled,
    });
  }, [mergedProps.disabled, updateInteractionVariant]);

  setControlContextData?.({ isStandalone });

  return (
    <Input
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
        padding: "2px 10px",
      },
      props: {
        placeholder: {
          type: "string",
        },
        disabled: {
          type: "boolean",
          description: "Whether the input is disabled",
          defaultValueHint: false,
          hidden: (_ps: BaseInputProps, ctx: BaseControlContextData | null) =>
            !ctx?.isStandalone,
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
