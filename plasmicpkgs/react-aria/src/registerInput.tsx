import React from "react";
import type { InputProps } from "react-aria-components";
import { Input } from "react-aria-components";
import {
  pickAriaComponentVariants,
  UpdateInteractionVariant,
} from "./interaction-variant-utils";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

const INPUT_INTERACTION_VARIANTS = ["focused" as const, "hovered" as const];

const { interactionVariants } = pickAriaComponentVariants(
  INPUT_INTERACTION_VARIANTS
);

export interface BaseInputProps extends InputProps {
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof INPUT_INTERACTION_VARIANTS
  >;
}

export function BaseInput(props: BaseInputProps) {
  const { updateInteractionVariant, ...rest } = props;

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
      {...rest}
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
      },
      trapsFocus: true,
    },
    overrides
  );
}
