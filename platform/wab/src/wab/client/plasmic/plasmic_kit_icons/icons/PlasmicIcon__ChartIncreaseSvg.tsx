/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ChartIncreaseSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ChartIncreaseSvgIcon(props: ChartIncreaseSvgIconProps) {
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
          "M7.75 16.25c6.389 0 8.25-4.563 8.25-7.75V5.75m0 0l-2.25 2.5M16 5.75l2.25 2.5m-13.5-3.5v14.5h14.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ChartIncreaseSvgIcon;
/* prettier-ignore-end */
