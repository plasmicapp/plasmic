import { CodeComponentMeta } from "@plasmicapp/host";
import React, { useMemo } from "react";
import { mergeProps } from "react-aria";
import { Slider, SliderThumbProps, SliderTrack } from "react-aria-components";
import flattenChildren from "react-keyed-flatten-children";
import { PlasmicSliderContext } from "./contexts";
import {
  UpdateInteractionVariant,
  pickAriaComponentVariants,
} from "./interaction-variant-utils";
import { BaseSliderThumbProps } from "./registerSliderThumb";
import {
  CodeComponentMetaOverrides,
  Registerable,
  isDefined,
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
function findMinMaxIndices(values: number[]): {
  minIndex: number;
  maxIndex: number;
} {
  let minIndex = 0;
  let maxIndex = 0;

  if (Array.isArray(values)) {
    for (let i = 1; i < values.length; i++) {
      if (values[i] < values[minIndex]) {
        minIndex = i;
      }
      if (values[i] > values[maxIndex]) {
        maxIndex = i;
      }
    }
  }

  return { minIndex, maxIndex };
}

function isMultiValueGuard(value?: number | number[]): value is number[] {
  return Array.isArray(value) && value.length > 1;
}

export function BaseSliderTrack(props: BaseSliderTrackProps) {
  const context = React.useContext(PlasmicSliderContext);
  const isStandalone = !context;
  const mergedProps = mergeProps(context, props);
  const { children, progressBar, updateInteractionVariant, ...rest } =
    mergedProps;

  const isMultiValue = isMultiValueGuard(mergedProps.value);

  const { minIndex, maxIndex } = useMemo(() => {
    if (
      !context ||
      !Array.isArray(context.value) ||
      context.value.length <= 1
    ) {
      return { minIndex: 0, maxIndex: 0 };
    }
    return findMinMaxIndices(context.value);
  }, [context?.value]);

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
    const thumbNodes = flattenChildren(children);
    if (!thumbNodes || thumbNodes.length === 0 || !isDefined(context?.value)) {
      return [];
    }

    const values = isDefined(context)
      ? Array.isArray(context.value)
        ? context.value
        : [context.value]
      : [];

    // Last thumb be re-used if the number of thumbs is less than the number of values
    const lastThumb = thumbNodes[thumbNodes.length - 1];

    return values.map((v, i) => {
      const currentThumb = thumbNodes[i];
      // Re-use the last thumb if there are no more thumbs left ( this is for ease of use - the user can just add one more value to the initial-values array and see another thumb right away, without having to explicitly add a new thumb component )
      if (i >= thumbNodes.length) {
        if (React.isValidElement(lastThumb)) {
          return React.cloneElement(lastThumb, {
            index: i,
          } as SliderThumbProps);
        }
      }
      if (!React.isValidElement(currentThumb)) {
        return null;
      }
      return React.cloneElement(currentThumb, {
        index: i,
      } as SliderThumbProps);
    });
  }, [children, context?.value]);

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
              {thumbs}
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

  if (isStandalone) {
    return <Slider style={{ height: "100%", width: "100%" }}>{track}</Slider>;
  }

  return track;
}

export const SLIDER_TRACK_COMPONENT_NAME = makeComponentName("sliderTrack");

export function registerSliderTrack(
  sliderThumbMeta: CodeComponentMeta<BaseSliderThumbProps>,
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseSliderTrack>
) {
  return registerComponentHelper(
    loader,
    BaseSliderTrack,
    {
      name: SLIDER_TRACK_COMPONENT_NAME,
      displayName: "Aria Slider Track",
      importPath: "@plasmicpkgs/react-aria/skinny/registerSliderTrack",
      importName: "BaseSliderTrack",
      interactionVariants,
      defaultStyles: {
        width: "stretch",
        backgroundColor: "#aaa",
        position: "relative",
        height: "10px",
        padding: 0,
      },
      props: {
        children: {
          type: "slot",
          displayName: "Thumbs",
          description:
            "The thumbs of the slider. For range slider, you can add more than one thumb.",
          allowedComponents: [sliderThumbMeta.name],
          allowRootWrapper: true,
          defaultValue: [
            {
              type: "component",
              name: sliderThumbMeta.name,
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
        onHoverStart: {
          type: "eventHandler",
          argTypes: [{ name: "event", type: "object" }],
        },
        onHoverEnd: {
          type: "eventHandler",
          argTypes: [{ name: "event", type: "object" }],
        },
        onHoverChange: {
          type: "eventHandler",
          argTypes: [{ name: "isHovering", type: "boolean" }],
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
