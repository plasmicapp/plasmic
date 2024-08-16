import React from "react";
import { SliderOutput } from "react-aria-components";
import {
  UpdateInteractionVariant,
  pickAriaComponentVariants,
} from "./interaction-variant-utils";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";

const SLIDER_OUTPUT_INTERACTION_VARIANTS = ["disabled" as const];
export interface BaseSliderOutputProps
  extends React.ComponentProps<typeof SliderOutput> {
  children?: React.ReactNode;
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof SLIDER_OUTPUT_INTERACTION_VARIANTS
  >;
}

const { interactionVariants, withObservedValues } = pickAriaComponentVariants(
  SLIDER_OUTPUT_INTERACTION_VARIANTS
);

export function BaseSliderOutput(props: BaseSliderOutputProps) {
  const { updateInteractionVariant, children, ...rest } = props;
  return (
    <SliderOutput {...rest}>
      {({ isDisabled }) =>
        withObservedValues(
          children,
          {
            disabled: isDisabled,
          },
          updateInteractionVariant
        )
      }
    </SliderOutput>
  );
}

export const SLIDER_OUTPUT_COMPONENT_NAME = makeComponentName("sliderOutput");

export function registerSliderOutput(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseSliderOutput>
) {
  return registerComponentHelper(
    loader,
    BaseSliderOutput,
    {
      name: SLIDER_OUTPUT_COMPONENT_NAME,
      displayName: "Aria Slider Output",
      importPath: "@plasmicpkgs/react-aria/skinny/registerSliderOutput",
      importName: "BaseSliderOutput",
      interactionVariants,
      props: {
        children: { type: "slot" },
      },
      trapsFocus: true,
    },
    overrides
  );
}
