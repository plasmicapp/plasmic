import React from "react";
import { Slider, SliderOutput } from "react-aria-components";
import { COMMON_STYLES, createIdProp } from "./common";
import { PlasmicSliderContext } from "./contexts";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";
import {
  VariantUpdater,
  WithVariants,
  pickAriaComponentVariants,
} from "./variant-utils";

const SLIDER_OUTPUT_VARIANTS = ["disabled" as const];
export interface BaseSliderOutputProps
  extends React.ComponentProps<typeof SliderOutput>,
    WithVariants<typeof SLIDER_OUTPUT_VARIANTS> {
  children?: React.ReactNode;
}

const { variants } = pickAriaComponentVariants(SLIDER_OUTPUT_VARIANTS);

export function BaseSliderOutput(props: BaseSliderOutputProps) {
  const { plasmicUpdateVariant, children, ...rest } = props;
  const isStandalone = !React.useContext(PlasmicSliderContext);
  const sliderOutput = (
    <SliderOutput {...rest} style={COMMON_STYLES}>
      {({ isDisabled }) => (
        <>
          <VariantUpdater
            changes={{
              disabled: isDisabled,
            }}
            updateVariant={plasmicUpdateVariant}
          />
          {children}
        </>
      )}
    </SliderOutput>
  );

  if (isStandalone) {
    return (
      <Slider style={{ height: "100%", width: "100%" }}>{sliderOutput}</Slider>
    );
  }
  return sliderOutput;
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
        id: createIdProp("Slider Output"),
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
