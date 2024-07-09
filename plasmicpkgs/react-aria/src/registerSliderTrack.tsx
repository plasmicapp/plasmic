import React, { useMemo } from "react";
import { mergeProps } from "react-aria";
import { Slider, SliderThumbProps, SliderTrack } from "react-aria-components";
import flattenChildren from "react-keyed-flatten-children";
import { PlasmicSliderContext } from "./contexts";
import ErrorBoundary from "./ErrorBoundary";
import {
  UpdateInteractionVariant,
  pickAriaComponentVariants,
} from "./interaction-variant-utils";
import { SLIDER_COMPONENT_NAME } from "./registerSlider";
import { SLIDER_THUMB_COMPONENT_NAME } from "./registerSliderThumb";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeChildComponentName,
  makeComponentName,
  registerComponentHelper,
} from "./utils";

const SLIDER_TRACK_INTERACTION_VARIANTS = ["hovered" as const];

const { interactionVariants, withObservedValues } = pickAriaComponentVariants(
  SLIDER_TRACK_INTERACTION_VARIANTS
);

export interface BaseSliderTrackProps
  extends React.ComponentProps<typeof SliderTrack> {
  progressBar?: React.ReactNode;
  // Optional callback to update the interaction variant state
  // as it's only provided if the component is the root of a Studio component
  updateInteractionVariant?: UpdateInteractionVariant<
    typeof SLIDER_TRACK_INTERACTION_VARIANTS
  >;
  children?: React.ReactElement<HTMLElement>;
}

/**
 * Finds the index of the minimum and maximum values in the slider
 * @param values
 * @returns
 */
function findMinMaxIndices(values?: number | number[]): {
  minIndex: number;
  maxIndex: number;
} {
  if (
    typeof values === "number" ||
    values?.length === 0 ||
    !Array.isArray(values)
  ) {
    return { minIndex: 0, maxIndex: 0 };
  }

  let minIndex = 0;
  let maxIndex = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[minIndex]) {
      minIndex = i;
    }
    if (values[i] > values[maxIndex]) {
      maxIndex = i;
    }
  }

  return { minIndex, maxIndex };
}

export function BaseSliderTrack(props: BaseSliderTrackProps) {
  const context = React.useContext(PlasmicSliderContext);
  const mergedProps = mergeProps(context, props);
  const {
    children,
    progressBar,
    updateInteractionVariant,
    isMultiValue,
    ...rest
  } = mergedProps;

  const { minIndex, maxIndex } = useMemo(
    () => findMinMaxIndices(mergedProps.value),
    [mergedProps.value]
  );

  /**
   * Generates the thumb components based on the number of thumbs
   * and the number of values in the slider
   *
   * If the number of thumbs is less than the number of values, then
   * the last thumb is repeated for the remaining values
   *
   * If the number of thumbs is greater than the number of values, then
   * the additional thumbs are omitted
   */
  const thumbs = useMemo(() => {
    const rawThumbs = flattenChildren(children);
    if (mergedProps.value === undefined) {
      return [];
    }
    if (!Array.isArray(mergedProps?.value)) {
      return rawThumbs;
    }
    const difference = mergedProps.value.length - rawThumbs.length;
    if (!difference) {
      return rawThumbs;
    }
    if (difference < 0) {
      return rawThumbs.slice(0, mergedProps.value.length);
    }
    const lastThumb = rawThumbs[rawThumbs.length - 1];
    return rawThumbs.concat(new Array(difference).fill(lastThumb));
  }, [children, mergedProps.value]);

  const track = (
    <SliderTrack style={{ position: "relative" }} {...rest}>
      {({ state, isHovered }) => (
        <>
          {withObservedValues(
            <>
              <div
                style={{
                  width: `${
                    (!isMultiValue
                      ? state.getThumbPercent(minIndex)
                      : state.getThumbPercent(maxIndex) -
                        state.getThumbPercent(minIndex)) * 100
                  }%`,
                  height: "100%",
                  position: "absolute",
                  top: 0,
                  left: !isMultiValue
                    ? 0
                    : state.getThumbPercent(minIndex) * 100 + "%",
                }}
              >
                {progressBar}
              </div>
              {thumbs.map(
                (thumb, i) =>
                  React.isValidElement(thumb) &&
                  React.cloneElement(thumb, {
                    // sets the index of the thumb, so that each thumb reflects the correct value
                    index: i,
                  } as SliderThumbProps)
              )}
            </>,
            {
              hovered: isHovered,
            },
            updateInteractionVariant
          )}
        </>
      )}
    </SliderTrack>
  );

  return (
    <ErrorBoundary
      // If the Slider Track is the root of a Studio component, then we need to wrap the track in a slider
      // to ensure that the track gets the required Slider context
      fallback={
        <Slider style={{ height: "100%", width: "100%" }}>{track}</Slider>
      }
    >
      {track}
    </ErrorBoundary>
  );
}

export const SLIDER_TRACK_COMPONENT_NAME = makeComponentName("sliderTrack");

export function registerSliderTrack(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseSliderTrack>
) {
  registerComponentHelper(
    loader,
    BaseSliderTrack,
    {
      name: SLIDER_TRACK_COMPONENT_NAME,
      displayName: "Aria Slider Track",
      importPath: "@plasmicpkgs/react-aria/skinny/registerSliderTrack",
      importName: "BaseSliderTrack",
      defaultStyles: {
        width: "stretch",
        backgroundColor: "#aaa",
        position: "relative",
        height: "10px",
        padding: 0,
      },
      interactionVariants,
      props: {
        children: {
          type: "slot",
          description: "The thumbs of the slider",
          defaultValue: [
            {
              type: "component",
              name: makeChildComponentName(
                SLIDER_COMPONENT_NAME,
                SLIDER_THUMB_COMPONENT_NAME
              ),
            },
          ],
        },
        progressBar: {
          type: "slot",
          displayName: "Progress Bar",
          defaultValue: [
            {
              type: "box",
              styles: {
                height: "100%",
                width: "100%",
                backgroundColor: "#ffa6a6",
                padding: 0,
              },
            },
          ],
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
