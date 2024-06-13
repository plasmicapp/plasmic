import { CSSProperties } from "react";

export const vectorNodeTypes = [
  "BOOLEAN_OPERATION",
  "VECTOR",
  "ELLIPSE",
  "STAR",
  "LINE",
  "POLYGON",
];

// We consider display invalid for code components since applying `display: block` to
// a code component root maybe doesn't work as expected so we will ignore it.
// Similarly to when a code component is inserted through the UI
export const invalidCodeComponentStyles = [
  "display",
] as (keyof CSSProperties)[];

export const boxShadowNodeTypes = [
  "RECTANGLE",
  "ELLIPSE",
  "FRAME",
  "INSTANCE",
  "COMPONENT",
];

export const delimiters = {
  backdropFilter: " ",
  background: ", ",
  boxShadow: ", ",
  filter: " ",
  textShadow: ", ",
  transform: " ",
};
