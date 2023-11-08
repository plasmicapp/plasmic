// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SquareIntersectsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SquareIntersectsvgIcon(props: SquareIntersectsvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M12.25 4.75h-5.5a2 2 0 00-2 2v5.5a2 2 0 002 2h5.5a2 2 0 002-2v-5.5a2 2 0 00-2-2z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M19.25 17.25v-5.5a2 2 0 00-2-2h-5.5a2 2 0 00-2 2v5.5a2 2 0 002 2h5.5a2 2 0 002-2z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SquareIntersectsvgIcon;
/* prettier-ignore-end */
