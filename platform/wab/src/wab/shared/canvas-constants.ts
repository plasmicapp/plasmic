export const plasmicClonedIndex = "data-plasmic-index";
export const slotPlaceholderAttr = "data-plasmic-slot-placeholder";
export const NO_INDEX_COPY = -1;

export const dataCanvasEnvsProp = "data-plasmic-canvas-envs";

// Code component props
export const setControlContextDataProp = "setControlContextData";

// Canvas V2 constants
export const valKeyProp = "data-plasmic-valkey";
export const renderingCtxProp = "data-plasmic-ctx";
export const valOwnerProp = "data-plasmic-valowner";
export const frameUidProp = "data-plasmic-frameuid";
export const classNameProp = "data-plasmic-classname";
export const slotFragmentKey = "data-plasmic-internal-attrs:";
export const repFragmentKey = "data-plasmic-rep:";
export const slotArgCompKeyProp = "data-plasmic-slot-comp-key";
export const slotArgParamProp = "data-plasmic-slot-param";
export const richTextProp = "data-plasmic-richtext";
export const slotExtraCanvasEnvProp = "data-slot-extra-canvas-envs";

export const internalCanvasElementProps = [
  valKeyProp,
  dataCanvasEnvsProp,
  renderingCtxProp,
  plasmicClonedIndex,
  valOwnerProp,
  classNameProp,
  frameUidProp,
  slotArgCompKeyProp,
  slotArgParamProp,
] as const;

export const INTERNAL_CC_CANVAS_SELECTION_PROP = "__plasmic_selection_prop__";
