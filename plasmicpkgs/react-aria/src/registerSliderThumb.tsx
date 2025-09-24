import React from "react";
import {
  Slider,
  SliderThumb,
  SliderTrack,
  SliderTrackContext,
} from "react-aria-components";
import { COMMON_STYLES, createAutoFocusProp, createDisabledProp, createNameProp } from "./common";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";
import { WithVariants, pickAriaComponentVariants } from "./variant-utils";

const SLIDER_THUMB_VARIANTS = [
  "dragging" as const,
  "hovered" as const,
  "focused" as const,
  "focusVisible" as const,
  "disabled" as const,
];

const { variants, withObservedValues } = pickAriaComponentVariants(
  SLIDER_THUMB_VARIANTS
);
export interface BaseSliderThumbProps
  extends React.ComponentProps<typeof SliderThumb>,
    WithVariants<typeof SLIDER_THUMB_VARIANTS> {
  advanced?: boolean;
}

export function BaseSliderThumb({
  children,
  advanced,
  plasmicUpdateVariant,
  ...rest
}: BaseSliderThumbProps) {
  const isStandalone = !React.useContext(SliderTrackContext);
  const thumb = (
    <SliderThumb
      {...rest}
      style={COMMON_STYLES}
    >
      {({ isDragging, isHovered, isFocused, isFocusVisible, isDisabled }) =>
        withObservedValues(
          <>{advanced ? children : undefined}</>,
          {
            dragging: isDragging,
            hovered: isHovered,
            focused: isFocused,
            focusVisible: isFocusVisible,
            disabled: isDisabled,
          },
          plasmicUpdateVariant
        )
      }
    </SliderThumb>
  );

  if (isStandalone) {
    return (
      <Slider style={{ height: "100%", width: "100%" }}>
        <SliderTrack>{thumb}</SliderTrack>
      </Slider>
    );
  }

  return thumb;
}

export const SLIDER_THUMB_COMPONENT_NAME = makeComponentName("sliderThumb");

export function registerSliderThumb(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseSliderThumb>
) {
  return registerComponentHelper(
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
      variants,
      props: {
        name: createNameProp(),
        isDisabled: createDisabledProp("Slider Thumb"),
        autoFocus: createAutoFocusProp("Slider Thumb"),
        advanced: {
          type: "boolean",
          displayName: "Advanced",
          description:
            "Enables the children slot for creating a more customized thumb",
        },
        children: {
          type: "slot",
          mergeWithParent: true,
          hidden: (props) => !props.advanced,
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
