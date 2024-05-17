import React from "react";
import type { TextAreaProps } from "react-aria-components";
import { TextArea } from "react-aria-components";
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

const TEXTAREA_INTERACTION_VARIANTS = ["focused" as const, "hovered" as const];

const { interactionVariants } = pickAriaComponentVariants(
  TEXTAREA_INTERACTION_VARIANTS
);

export interface BaseTextAreaProps extends TextAreaProps {
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof TEXTAREA_INTERACTION_VARIANTS
  >;
}

export function BaseTextArea(props: BaseTextAreaProps) {
  const { disabled, updateInteractionVariant, ...rest } = props;

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
      disabled={disabled}
      {...rest}
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
        placeholder: {
          type: "string",
        },
        onKeyDown: {
          type: "eventHandler",
          argTypes: [{ name: "keyboardEvent", type: "object" }],
        },
        onKeyUp: {
          type: "eventHandler",
          argTypes: [{ name: "keyboardEvent", type: "object" }],
        },
        onCopy: {
          type: "eventHandler",
          argTypes: [{ name: "clipbordEvent", type: "object" }],
        },
        onCut: {
          type: "eventHandler",
          argTypes: [{ name: "clipbordEvent", type: "object" }],
        },
        onPaste: {
          type: "eventHandler",
          argTypes: [{ name: "clipbordEvent", type: "object" }],
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
