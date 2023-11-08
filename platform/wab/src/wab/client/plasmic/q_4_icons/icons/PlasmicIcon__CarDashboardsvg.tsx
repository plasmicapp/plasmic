// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type CarDashboardsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CarDashboardsvgIcon(props: CarDashboardsvgIconProps) {
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
        d={"M19.25 12a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M16.075 17.79C15.5 16.5 13.656 15.75 12 15.75c-1.656 0-3.5.75-4.075 2.04m3.825-5.54l2.5-2.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CarDashboardsvgIcon;
/* prettier-ignore-end */
