import React, { useEffect } from "react";
import { mergeProps } from "react-aria";
import type { TextAreaProps } from "react-aria-components";
import { TextArea } from "react-aria-components";
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

const TEXTAREA_INTERACTION_VARIANTS = [
  "focused" as const,
  "hovered" as const,
  "disabled" as const,
];

const { interactionVariants } = pickAriaComponentVariants(
  TEXTAREA_INTERACTION_VARIANTS
);

export interface BaseTextAreaProps extends TextAreaProps {
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof TEXTAREA_INTERACTION_VARIANTS
  >;
  setControlContextData?: (ctxData: BaseControlContextData) => void;
}

export function BaseTextArea(props: BaseTextAreaProps) {
  const { disabled, updateInteractionVariant, setControlContextData, ...rest } =
    props;

  const context = React.useContext(PlasmicTextFieldContext);
  const isStandalone = !context;

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
        placeholder: {
          type: "string",
        },
        disabled: {
          type: "boolean",
          description: "Whether the input is disabled",
          defaultValueHint: false,
          hidden: (
            _ps: BaseTextAreaProps,
            ctx: BaseControlContextData | null
          ) => !ctx?.isStandalone,
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
