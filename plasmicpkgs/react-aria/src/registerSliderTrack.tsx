import { CodeComponentMeta } from "@plasmicapp/host";
import React, { useMemo } from "react";
import { Slider, SliderThumbProps, SliderTrack } from "react-aria-components";
import flattenChildren from "react-keyed-flatten-children";
import { COMMON_STYLES } from "./common";
import { PlasmicSliderContext } from "./contexts";
import { BaseSliderThumbProps } from "./registerSliderThumb";
import {
  CodeComponentMetaOverrides,
  Registerable,
  isDefined,
  makeComponentName,
  registerComponentHelper,
} from "./utils";
import { WithVariants, pickAriaComponentVariants } from "./variant-utils";

const SLIDER_TRACK_VARIANTS = ["hovered" as const];

const { variants, withObservedValues } = pickAriaComponentVariants(
  SLIDER_TRACK_VARIANTS
);

export interface BaseSliderTrackProps
  extends React.ComponentProps<typeof SliderTrack>,
    WithVariants<typeof SLIDER_TRACK_VARIANTS> {
  progressBar?: React.ReactNode;
  children?: React.ReactElement<HTMLElement>;
}

function isMultiValueGuard(value?: number | number[]): value is number[] {
  return Array.isArray(value) && value.length > 1;
}

export function BaseSliderTrack(props: BaseSliderTrackProps) {
  const context = React.useContext(PlasmicSliderContext);
  const isStandalone = !context;
  const { children, progressBar, plasmicUpdateVariant, ...rest } = props;

  const thumbsLength =
    context && isMultiValueGuard(context.value) ? context.value.length : 1;
  const isMultiValue = thumbsLength > 1;

  const { minIndex, maxIndex } = useMemo(() => {
    if (thumbsLength <= 1) {
      return { minIndex: 0, maxIndex: 0 };
    }
    return { minIndex: 0, maxIndex: thumbsLength - 1 };
  }, [thumbsLength]);

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
            plasmicUpdateVariant
          )}
        </>
      )}
    </SliderTrack>
  );

  if (isStandalone) {
    return (
      <Slider style={{ height: "100%", width: "100%", ...COMMON_STYLES }}>
        {track}
      </Slider>
    );
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
      variants,
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
          /**
           * NOTE: We don't merge with parent here, because we want to allow the user to select the thumbs without having to first select the slider track.
           * Also, there can be more than one thumbs (e.g. in a range slider), but `mergeWithParent` only shows prop controls of the slot content if there is only one direct descendant of the slot.
           * */
          // mergeWithParent: true,
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
          mergeWithParent: true,
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
    },
    overrides
  );
}
