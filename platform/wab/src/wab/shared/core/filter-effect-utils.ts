import { ensure } from "@/wab/shared/common";
import { capitalize, Dictionary } from "lodash";

export type FilterEffectType =
  | "blur"
  | "brightness"
  | "contrast"
  | "drop-shadow"
  | "grayscale"
  | "hue-rotate"
  | "invert"
  | "opacity"
  | "saturate"
  | "sepia";

export interface FilterEffect {
  type: FilterEffectType;
  args: string[];
  visible: boolean;
}

export const defaultFilterEffects: Dictionary<FilterEffect> = {
  blur: {
    type: "blur",
    args: ["0px"],
    visible: true,
  },
  brightness: {
    type: "brightness",
    args: ["100%"],
    visible: true,
  },
  contrast: {
    type: "contrast",
    args: ["100%"],
    visible: true,
  },
  "drop-shadow": {
    type: "drop-shadow",
    args: ["10px 10px 10px #FFFFFF"],
    visible: true,
  },
  grayscale: {
    type: "grayscale",
    args: ["0%"],
    visible: true,
  },
  "hue-rotate": {
    type: "hue-rotate",
    args: ["0deg"],
    visible: true,
  },
  invert: {
    type: "invert",
    args: ["0%"],
    visible: true,
  },
  saturate: {
    type: "saturate",
    args: ["100%"],
    visible: true,
  },
  sepia: {
    type: "sepia",
    args: ["0%"],
    visible: true,
  },
};

export const filterEffectEditorConfig: Dictionary<{
  label: string;
  max: number;
  allowedUnits: string[];
}> = {
  blur: {
    label: "Radius",
    max: 20,
    allowedUnits: ["px"],
  },
  brightness: {
    label: "Amount",
    max: 200,
    allowedUnits: ["%"],
  },
  contrast: {
    label: "Amount",
    max: 200,
    allowedUnits: ["%"],
  },
  "hue-rotate": {
    label: "Angle",
    max: 360,
    allowedUnits: ["deg"],
  },
  saturate: {
    label: "Amount",
    max: 200,
    allowedUnits: ["%"],
  },
  grayscale: {
    label: "Amount",
    max: 100,
    allowedUnits: ["%"],
  },
  invert: {
    label: "Amount",
    max: 100,
    allowedUnits: ["%"],
  },
  sepia: {
    label: "Amount",
    max: 100,
    allowedUnits: ["%"],
  },
};

export const getFilterEffectLabel = (effect: string) => {
  return capitalize(effect).replace("-", " ");
};

export const fromFilterStringToObj = (rawFilter: string): FilterEffect => {
  const FILTER_PATTERN =
    /(hidden#)?[a-z-]*\((([0-9]+(%|deg|px) ?)|(#[0-9A-F]{6,8})){1,4}\)/g;
  const FILTER_SPLIT_PATTERN =
    /(hidden#)?[a-z-]*\(|(([0-9]+(%|deg|px) ?)|(#[0-9A-F]{6,8})){1,4}|\)/g;
  if (!rawFilter.match(FILTER_PATTERN)) {
    return defaultFilterEffects.blur;
  }

  const elements = ensure(rawFilter.match(FILTER_SPLIT_PATTERN));
  const filterType = elements[0].slice(0, -1).split("#");
  return {
    type: filterType.slice(-1)[0] as FilterEffectType,
    args: elements[1].split(" "),
    visible: filterType.length === 1,
  };
};

export const fromFilterObjToString = (filter: FilterEffect): string => {
  return `${!filter.visible ? "hidden#" : ""}${filter.type}(${filter.args.join(
    " "
  )})`;
};
