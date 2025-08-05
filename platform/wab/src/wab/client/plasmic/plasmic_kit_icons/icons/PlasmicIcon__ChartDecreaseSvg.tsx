/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ChartDecreaseSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ChartDecreaseSvgIcon(props: ChartDecreaseSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M4.75 4.75v14.5h14.5M7.75 4.75c6.389 0 8.25 4.563 8.25 7.75v2.75m0 0l-2.25-2.5m2.25 2.5l2.25-2.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ChartDecreaseSvgIcon;
/* prettier-ignore-end */
