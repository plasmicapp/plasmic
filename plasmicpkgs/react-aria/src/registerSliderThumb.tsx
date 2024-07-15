import React from "react";
import { mergeProps } from "react-aria";
import { Slider, SliderThumb, SliderTrack } from "react-aria-components";
import { PlasmicSliderContext } from "./contexts";
import ErrorBoundary from "./ErrorBoundary";
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

const SLIDER_THUMB_INTERACTION_VARIANTS = [
  "dragging" as const,
  "hovered" as const,
  "focused" as const,
  "focusVisible" as const,
];

const { interactionVariants, withObservedValues } = pickAriaComponentVariants(
  SLIDER_THUMB_INTERACTION_VARIANTS
);
interface BaseSliderThumbProps
  extends React.ComponentProps<typeof SliderThumb> {
  advanced?: boolean;
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof SLIDER_THUMB_INTERACTION_VARIANTS
  >;
}

export function BaseSliderThumb({
  children,
  advanced,
  updateInteractionVariant,
  ...rest
}: BaseSliderThumbProps) {
  const context = React.useContext(PlasmicSliderContext);
  const mergedProps = mergeProps(context, rest);

  const thumb = (
    <SliderThumb {...mergedProps}>
      {({ isDragging, isHovered, isFocused, isFocusVisible }) =>
        withObservedValues(
          <>{advanced ? children : undefined}</>,
          {
            dragging: isDragging,
            hovered: isHovered,
            focused: isFocused,
            focusVisible: isFocusVisible,
          },
          updateInteractionVariant
        )
      }
    </SliderThumb>
  );

  return (
    <ErrorBoundary
      // If the Slider Thumb is the root of a Studio component, then we need to wrap the thumb in a track
      // to ensure that the thumb gets the required Slider context
      fallback={
        <Slider style={{ height: "100%", width: "100%" }}>
          <SliderTrack>{thumb}</SliderTrack>
        </Slider>
      }
    >
      {thumb}
    </ErrorBoundary>
  );
}

export const SLIDER_THUMB_COMPONENT_NAME = makeComponentName("sliderThumb");

export function registerSliderThumb(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseSliderThumb>
) {
  registerComponentHelper(
    loader,
    BaseSliderThumb,
    {
      name: SLIDER_THUMB_COMPONENT_NAME,
      displayName: "Aria Slider Thumb",
      importPath: "@plasmicpkgs/react-aria/skinny/registerSliderThumb",
      importName: "BaseSliderThumb",
      defaultStyles: {
        position: "absolute",
        top: "5px",
        width: "20px",
        height: "20px",
        backgroundColor: "#C80101",
        borderRadius: "100%",
        cursor: "pointer",
      },
      interactionVariants,
      props: {
        advanced: {
          type: "boolean",
          displayName: "Advanced",
          description:
            "Enables the children slot for creating a more customized thumb",
        },
        children: {
          type: "slot",
          hidden: (ps: BaseSliderThumbProps) => !ps.advanced,
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
