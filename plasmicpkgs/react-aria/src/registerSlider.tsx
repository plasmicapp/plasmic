import React, { useEffect, useRef } from "react";
import { mergeProps } from "react-aria";
import { Slider, type SliderProps } from "react-aria-components";
import { getCommonInputProps } from "./common";
import { PlasmicSliderContext } from "./contexts";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import {
  SLIDER_OUTPUT_COMPONENT_NAME,
  registerSliderOutput,
} from "./registerSliderOutput";
import { registerSliderThumb } from "./registerSliderThumb";
import {
  SLIDER_TRACK_COMPONENT_NAME,
  registerSliderTrack,
} from "./registerSliderTrack";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeChildComponentName,
  makeComponentName,
  registerComponentHelper,
} from "./utils";

export const SLIDER_COMPONENT_NAME = makeComponentName("slider");

export interface BaseSliderProps
  extends Omit<SliderProps<number | number[]>, "onChange"> {
  // Passed down to Slider Thumb via context
  name?: string;
  autoFocus?: boolean;
  isMultiValue?: boolean;
  range?: number[];
  defaultRange?: number[];
  onChange?: (value: number | number[], isMultiValue?: boolean) => void;
}

export const sliderHelpers = {
  states: {
    range: {
      onChangeArgsToValue: (value: number[], isMultiValue: boolean) => {
        if (isMultiValue) {
          return Array.isArray(value) ? value : [value, value + 10];
        }
        return undefined;
      },
    },
    value: {
      onChangeArgsToValue: (value: number, isMultiValue: boolean) => {
        if (isMultiValue) {
          return undefined;
        }
        return Array.isArray(value) ? value[0] : value;
      },
    },
  },
};

export function BaseSlider(props: BaseSliderProps) {
  const { range, value, defaultRange, defaultValue, onChange, ...rest } = props;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (props.isMultiValue) {
      const minValue = props.minValue ?? 0;
      props.onChange?.(
        Array.isArray(range) && range.length > 1
          ? range
          : [minValue, minValue + 10],
        true
      );
      return;
    }
    props.onChange?.(Array.isArray(value) ? 0 : value ?? 0, false);
  }, [props.isMultiValue]);

  const mergedProps = mergeProps(rest, {
    value: props.isMultiValue ? range : value,
    defaultValue: props.isMultiValue ? defaultRange : defaultValue,
  });
  return (
    <PlasmicSliderContext.Provider value={mergedProps}>
      <Slider
        key={props.isMultiValue ? "multi" : "single"}
        onChange={(newValue) => {
          onChange?.(newValue, props.isMultiValue);
        }}
        {...mergedProps}
      />
    </PlasmicSliderContext.Provider>
  );
}

export function registerSlider(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseSlider>
) {
  registerComponentHelper(
    loader,
    BaseSlider,
    {
      name: SLIDER_COMPONENT_NAME,
      displayName: "Aria Slider",
      importPath: "@plasmicpkgs/react-aria/skinny/registerSlider",
      importName: "BaseSlider",
      defaultStyles: {
        width: "300px",
      },
      props: {
        ...getCommonInputProps<BaseSliderProps>("slider", [
          "isDisabled",
          "name",
          "autoFocus",
          "aria-label",
        ]),
        children: {
          type: "slot",
          defaultValue: [
            {
              type: "hbox",
              styles: {
                width: "stretch",
                justifyContent: "space-between",
                padding: "8px 0px",
              },
              children: [
                {
                  type: "component",
                  name: LABEL_COMPONENT_NAME,
                  props: {
                    children: {
                      type: "text",
                      value: "Label",
                    },
                  },
                },
                {
                  type: "component",
                  name: makeChildComponentName(
                    SLIDER_COMPONENT_NAME,
                    SLIDER_OUTPUT_COMPONENT_NAME
                  ),
                  props: {
                    children: {
                      type: "text",
                      value: "Output",
                    },
                  },
                },
              ],
            },
            {
              type: "component",
              name: makeChildComponentName(
                SLIDER_COMPONENT_NAME,
                SLIDER_TRACK_COMPONENT_NAME
              ),
            },
          ],
        },
        orientation: {
          type: "choice",
          options: ["horizontal", "vertical"],
          defaultValueHint: "horizontal",
          defaultValue: "horizontal",
        },
        minValue: {
          type: "number",
          description: "The minimum value of the slider",
          defaultValueHint: 0,
        },
        maxValue: {
          type: "number",
          description: "The maximum value of the slider",
          defaultValueHint: 100,
        },
        step: {
          type: "number",
          description: "The step value of the slider",
          defaultValueHint: 1,
        },
        isMultiValue: {
          type: "boolean",
          displayName: "Multi-valued",
          description: "Whether the slider supports range (multiple thumbs)",
          defaultValue: false,
          defaultValueHint: false,
        },
        range: {
          type: "array",
          editOnly: true,
          uncontrolledProp: "defaultRange",
          description: "The default range of the slider",
          defaultValueHint: [10, 20],
          defaultValue: [10, 20],
          hidden: (ps: BaseSliderProps) => !ps.isMultiValue,
        },
        value: {
          type: "number",
          editOnly: true,
          uncontrolledProp: "defaultValue",
          description: "The default value of the slider",
          defaultValueHint: 0,
          defaultValue: 0,
          hidden: (ps: BaseSliderProps) => Boolean(ps.isMultiValue),
        },
        onChange: {
          type: "eventHandler",
          argTypes: [{ name: "value", type: "object" }],
        },
        onChangeEnd: {
          type: "eventHandler",
          argTypes: [{ name: "value", type: "object" }],
        },
      },
      states: {
        range: {
          type: "writable",
          valueProp: "range",
          onChangeProp: "onChange",
          variableType: "array",
          hidden: (ps: BaseSliderProps) => !ps.isMultiValue,
          ...sliderHelpers.states.range,
        },
        value: {
          type: "writable",
          valueProp: "value",
          onChangeProp: "onChange",
          variableType: "number",
          hidden: (ps: BaseSliderProps) => Boolean(ps.isMultiValue),
          ...sliderHelpers.states.value,
        },
      },
      componentHelpers: {
        helpers: sliderHelpers,
        importName: "sliderHelpers",
        importPath: "@plasmicpkgs/react-aria/skinny/registerSlider",
      },
      trapsFocus: true,
    },
    overrides
  );

  registerSliderOutput(loader, {
    parentComponentName: SLIDER_COMPONENT_NAME,
  });

  registerSliderThumb(loader, {
    parentComponentName: SLIDER_COMPONENT_NAME,
  });
  registerSliderTrack(loader, {
    parentComponentName: SLIDER_COMPONENT_NAME,
  });
}
