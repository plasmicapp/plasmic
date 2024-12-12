import React from "react";
import { SliderOutput } from "react-aria-components";
import { COMMON_STYLES } from "./common";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";
import { WithVariants, pickAriaComponentVariants } from "./variant-utils";

const SLIDER_OUTPUT_VARIANTS = ["disabled" as const];
export interface BaseSliderOutputProps
  extends React.ComponentProps<typeof SliderOutput>,
    WithVariants<typeof SLIDER_OUTPUT_VARIANTS> {
  children?: React.ReactNode;
}

const { variants, withObservedValues } = pickAriaComponentVariants(
  SLIDER_OUTPUT_VARIANTS
);

export function BaseSliderOutput(props: BaseSliderOutputProps) {
  const { plasmicUpdateVariant, children, ...rest } = props;
  return (
    <SliderOutput {...rest} style={COMMON_STYLES}>
      {({ isDisabled }) =>
        withObservedValues(
          children,
          {
            disabled: isDisabled,
          },
          plasmicUpdateVariant
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
      variants,
      props: {
        children: {
          mergeWithParent: true,
          type: "slot",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
