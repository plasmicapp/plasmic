import { PropType } from "@plasmicapp/host";
import { Slider } from "antd";
import type { SliderTooltipProps } from "antd/lib/slider";
import type { TooltipPlacement } from "antd/lib/tooltip";
import kebabCase from "lodash/kebabCase";
import React, { ReactElement, useMemo } from "react";
import { Registerable, registerComponentHelper } from "./utils";

export type StylableMark = {
  mark: number;
  children: React.ReactNode;
};

export type SliderTooltip = {
  tooltipPrefix?: string;
  tooltipSuffix?: string;
  tooltipVisible?: boolean | string;
  tooltipPlacement?: TooltipPlacement;
};

export type SimpleMark = { value: number; label: string };

export type AntdSliderBaseProps = Omit<
  React.ComponentProps<typeof Slider>,
  | "range"
  | "tooltipVisible"
  | "tooltip"
  | "marks"
  | "onChange"
  | "onAfterChange"
  | "value"
  | "defaultValue"
  | "trackStyle"
  | "railStyle"
  | "handleStyle"
> &
  SliderTooltip & {
    stylableMarks?: ReactElement;
    marks?: SimpleMark[];
    sliderScopeClassName?: string;
  };

export interface AntdSingleSliderProps extends AntdSliderBaseProps {
  value?: number;
  defaultValue?: number;
  onChange: (value?: number) => void;
  onAfterChange: (value?: number) => void;
}

export interface AntdRangeSliderProps extends AntdSliderBaseProps {
  draggableTrack?: boolean;
  valueMin?: number;
  valueMax?: number;
  defaultValueMin?: number;
  defaultValueMax?: number;
  onChange: (value?: number[]) => void;
  onAfterChange: (value?: number[]) => void;
}

export function useMarks({
  simpleMarks,
  stylableMarks,
}: {
  simpleMarks?: SimpleMark[];
  stylableMarks?: ReactElement;
}): Record<number, React.ReactNode | { label: string }> {
  const marks: Record<number, React.ReactNode | { label: string }> =
    useMemo(() => {
      const stylableMarksList =
        (stylableMarks?.type as any)?.name == AntdSliderMark.name
          ? [stylableMarks]
          : stylableMarks?.props.children;
      const res: Record<number, React.ReactNode | { label: string }> = {};

      stylableMarksList
        ?.filter(
          (c: any) =>
            React.isValidElement(c) &&
            (c.type as any)?.name === AntdSliderMark.name
        )
        .forEach((c: ReactElement<StylableMark>) => {
          res[c.props.mark] = c.props.children;
        });

      simpleMarks?.forEach((mark) => {
        res[mark.value] = { label: mark.label };
      });
      return res;
    }, [simpleMarks, stylableMarks]);

  return marks;
}

export function useTooltip({
  tooltipVisible,
  tooltipPlacement,
  tooltipPrefix,
  tooltipSuffix,
}: SliderTooltip): SliderTooltipProps {
  return {
    open: tooltipVisible === "unset" ? undefined : Boolean(tooltipVisible),
    placement: tooltipPlacement,
    getPopupContainer: (node) => node,
    formatter: (value) =>
      `${tooltipPrefix || ""}${value}${tooltipSuffix || ""}`,
  };
}

export function AntdRangeSlider(props: AntdRangeSliderProps) {
  const {
    marks,
    stylableMarks,
    sliderScopeClassName,
    className,
    tooltipVisible,
    tooltipPlacement,
    tooltipPrefix,
    tooltipSuffix,
    draggableTrack,
    valueMin,
    valueMax,
    defaultValueMin,
    defaultValueMax,
    ...rest
  } = props;
  const marksProp = useMarks({ simpleMarks: marks, stylableMarks });
  const tooltipProp = useTooltip({
    tooltipVisible,
    tooltipPlacement,
    tooltipPrefix,
    tooltipSuffix,
  });
  return (
    <Slider
      value={[valueMin || 0, valueMax || 0]}
      defaultValue={[defaultValueMin || 0, defaultValueMax || 0]}
      range={{ draggableTrack }}
      className={`${sliderScopeClassName} ${className}`}
      tooltip={tooltipProp}
      marks={marksProp}
      {...rest}
    />
  );
}

export function AntdSingleSlider(props: AntdSingleSliderProps) {
  const {
    marks,
    stylableMarks,
    sliderScopeClassName,
    className,
    tooltipVisible,
    tooltipPlacement,
    tooltipPrefix,
    tooltipSuffix,
    ...rest
  } = props;

  const marksProp = useMarks({ simpleMarks: marks, stylableMarks });
  const tooltipProp = useTooltip({
    tooltipVisible,
    tooltipPlacement,
    tooltipPrefix,
    tooltipSuffix,
  });
  return (
    <Slider
      className={`${sliderScopeClassName} ${className}`}
      tooltip={tooltipProp}
      marks={marksProp}
      {...rest}
    />
  );
}

export function AntdSliderMark(props: StylableMark) {
  return <>{props.children}</>;
}

export const sliderComponentName = "plasmic-antd5-slider";
export const rangeSliderComponentName = "plasmic-antd5-range-slider";
export const sliderMarkComponentName = "plasmic-antd5-slider-mark";

const commonProps: Record<string, PropType<any>> = {
  autoFocus: {
    type: "boolean",
    description: "Focus when component is rendered",
    defaultValueHint: false,
    advanced: true,
  },
  disabled: {
    type: "boolean",
    description: "If true, the slider thumb will not be draggable",
    defaultValueHint: false,
  },
  keyboard: {
    type: "boolean",
    description: "Support using keyboard to move handlers",
    defaultValueHint: true,
    advanced: true,
  },
  dots: {
    type: "boolean",
    displayName: "Show dots",
    description: "Show dot at every step on the slider",
    defaultValueHint: false,
    advanced: true,
  },
  marks: {
    type: "array",
    description: "Specific markers or snap points on the slider",
    itemType: {
      nameFunc: (value) => `${value.value} → ${value.label}`,
      type: "object",
      fields: {
        value: {
          type: "number",
          description: "value on the slider",
        },
        label: "string",
      },
    },
  },
  stylableMarks: {
    type: "slot",
    displayName: "Stylable Marks",
    allowedComponents: [sliderMarkComponentName],
    defaultValue: [
      {
        type: "component",
        name: sliderMarkComponentName,
        props: {
          mark: 50,
          children: {
            type: "text",
            value: "Stylable Mark",
          },
        },
      },
    ],
  },
  included: {
    type: "boolean",
    description: "Fill the slider till the selected value",
    defaultValueHint: true,
    advanced: true,
  },
  min: {
    type: "number",
    description: "The minimum value the slider can slide to",
    defaultValueHint: 0,
    displayName: "Slider start",
  },
  max: {
    type: "number",
    description: "The maximum value the slider can slide to",
    defaultValueHint: 100,
    displayName: "Slider end",
  },
  reverse: {
    type: "boolean",
    description:
      "Reverse the slider, so that the starting point is at the right end",
    defaultValueHint: false,
    advanced: true,
  },
  step: {
    type: "number",
    description: "Granularity of the slider's movement",
    defaultValueHint: 1,
    min: 0,
  },
  vertical: {
    type: "boolean",
    description: "Slide vertically",
    defaultValueHint: false,
    advanced: true,
    helpText:
      "Please increase the slider height to make the vertical slider visible",
  },
  tooltipVisible: {
    type: "choice",
    displayName: "Show tooltip",
    options: [
      {
        value: true,
        label: "Always",
      },
      {
        value: false,
        label: "Never",
      },
      {
        value: "unset",
        label: "Only on drag/hover",
      },
    ],
    defaultValueHint: "unset",
    defaultValue: "unset",
    advanced: true,
  },
  tooltipPlacement: {
    type: "choice",
    options: [
      "topLeft",
      "top",
      "topRight",
      "leftTop",
      "left",
      "leftBottom",
      "rightTop",
      "right",
      "rightBottom",
      "bottomLeft",
      "bottom",
      "bottomRight",
    ].map((item) => ({
      value: item,
      label: kebabCase(item),
    })),
    description: "Default placement of tooltip",
    defaultValueHint: "top",
    advanced: true,
  },
  tooltipPrefix: {
    type: "string",
    description: "Add a prefix to the slider value inside tooltip",
    advanced: true,
  },
  tooltipSuffix: {
    type: "string",
    description: "Add a suffix to the slider value inside tooltip",
    advanced: true,
  },
  sliderScopeClassName: {
    type: "styleScopeClass",
    scopeName: "slider",
  } as any,
  railClassName: {
    type: "class",
    displayName: "Rail",
    description: "The path on which the thumb moves",
    selectors: [
      {
        selector: ":slider.ant-slider .ant-slider-rail",
        label: "Base",
      },
    ],
  },
  trackClassName: {
    type: "class",
    displayName: "Track",
    description: "The inclusive part of the slider rail",
    selectors: [
      {
        selector: ":slider.ant-slider .ant-slider-track",
        label: "Base",
      },
    ],
  },
  handleClassName: {
    type: "class",
    displayName: "Handle",
    description: "Thumb of the slider that moves on drag",
    selectors: [
      {
        selector: ":slider.ant-slider .ant-slider-handle::after",
        label: "Base",
      },
    ],
  },
  dotClassName: {
    type: "class",
    displayName: "Step dots",
    description: "The dots that represent steps on the slider rail",
    selectors: [
      {
        selector: ":slider.ant-slider .ant-slider-dot",
        label: "Base",
      },
    ],
  },
  activeDotClassName: {
    type: "class",
    displayName: "Active dots",
    description: "The dots within the inclusive part of the slider rail",
    selectors: [
      {
        selector: ":slider.ant-slider .ant-slider-dot.ant-slider-dot-active",
        label: "Base",
      },
    ],
  },
  tooltipClassName: {
    type: "class",
    displayName: "Tooltip",
    description: "The tooltip that shows the value of the slider",
    selectors: [
      {
        selector: ":slider.ant-slider .ant-slider-tooltip",
        label: "Base",
      },
    ],
  },
};

export const rangeSliderHelpers = {
  states: {
    min: {
      onChangeArgsToValue: (value: number[]) => value[0],
    },
    max: {
      onChangeArgsToValue: (value: number[]) => value[1],
    },
  },
};

export function registerSlider(loader?: Registerable) {
  registerComponentHelper(loader, AntdSingleSlider, {
    name: sliderComponentName,
    displayName: "Slider",
    defaultStyles: {
      width: "300px",
    },
    props: {
      value: {
        type: "number",
        editOnly: true,
        uncontrolledProp: "defaultValue",
        description: "The default value of the slider",
      },
      onChange: {
        type: "eventHandler",
        advanced: true,
        argTypes: [{ name: "value", type: "number" }],
      },
      onAfterChange: {
        type: "eventHandler",
        advanced: true,
        argTypes: [{ name: "value", type: "number" }],
      },
      ...commonProps,
    },
    states: {
      value: {
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChange",
        variableType: "text",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerSlider",
    importName: "AntdSingleSlider",
  });
  registerComponentHelper(loader, AntdRangeSlider, {
    name: rangeSliderComponentName,
    displayName: "Range Slider",
    defaultStyles: {
      width: "300px",
    },
    props: {
      draggableTrack: {
        type: "boolean",
        defaultValueHint: false,
        description: "Whether range track can be dragged",
      },
      valueMin: {
        type: "number",
        editOnly: true,
        uncontrolledProp: "defaultValueMin",
        description: "The default minimum value of the range slider",
      },
      valueMax: {
        type: "number",
        editOnly: true,
        uncontrolledProp: "defaultValueMax",
        description: "The default maximum value of the range slider",
      },
      onChange: {
        type: "eventHandler",
        advanced: true,
        argTypes: [{ name: "value", type: "object" }],
      },
      onAfterChange: {
        type: "eventHandler",
        advanced: true,
        argTypes: [{ name: "value", type: "object" }],
      },
      ...commonProps,
    },
    states: {
      min: {
        type: "writable",
        valueProp: "valueMin",
        onChangeProp: "onChange",
        variableType: "number",
        ...rangeSliderHelpers.states.min,
      },
      max: {
        type: "writable",
        valueProp: "valueMax",
        onChangeProp: "onChange",
        variableType: "number",
        ...rangeSliderHelpers.states.max,
      },
    },
    componentHelpers: {
      helpers: rangeSliderHelpers,
      importName: "rangeSliderHelpers",
      importPath: "@plasmicpkgs/antd5/skinny/registerSlider",
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerSlider",
    importName: "AntdRangeSlider",
  });
  registerComponentHelper(loader, AntdSliderMark, {
    name: sliderMarkComponentName,
    displayName: "Slider Mark",
    props: {
      mark: {
        type: "number",
        description: "value on the slider",
      },
      children: {
        type: "slot",
        hidePlaceholder: true,
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerSlider",
    importName: "AntdSliderMark",
    parentComponentName: sliderComponentName,
  });
}
