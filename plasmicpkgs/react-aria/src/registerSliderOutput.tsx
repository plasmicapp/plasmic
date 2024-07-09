import { SliderOutput } from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";

export const BaseSliderOutput = SliderOutput;

export const SLIDER_OUTPUT_COMPONENT_NAME = makeComponentName("sliderOutput");

export function registerSliderOutput(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseSliderOutput>
) {
  registerComponentHelper(
    loader,
    BaseSliderOutput,
    {
      name: SLIDER_OUTPUT_COMPONENT_NAME,
      displayName: "Aria Slider Output",
      importPath: "@plasmicpkgs/react-aria/skinny/registerSliderOutput",
      importName: "BaseSliderOutput",
      props: {
        children: { type: "slot" },
      },
      trapsFocus: true,
    },
    overrides
  );
}
