import { Corner, Side } from "@/wab/shared/geom";
import L from "lodash";
import * as React from "react";
import { ReactNode } from "react";

interface SidesAndCornersProps {
  empty?: () => ReactNode;
  side?: (side: Side) => ReactNode;
  corner?: (side: Corner) => ReactNode;
  center?: () => ReactNode;
}

export const sidesAndCorners = ({
  empty = () => <div />,
  side = empty,
  corner = empty,
  center = empty,
}: SidesAndCornersProps) => {
  return (
    <>
      {corner("top-left")}
      {side("top")}
      {corner("top-right")}
      {side("left")}
      {center()}
      {side("right")}
      {corner("bottom-left")}
      {side("bottom")}
      {corner("bottom-right")}
    </>
  );
};

export function styleCase(text: string) {
  return L.startCase(text).replace(" ", "");
}

export function isEmptyReactNode(node: ReactNode) {
  return !node || (Array.isArray(node) && node.every(isEmptyReactNode));
}
