// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BuildingsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BuildingsvgIcon(props: BuildingsvgIconProps) {
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
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M5.75 6.75a2 2 0 012-2h8.5a2 2 0 012 2v12.5H5.75V6.75zm13.5 12.5H4.75"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M9.75 15.75a2 2 0 012-2h.5a2 2 0 012 2v3.5h-4.5v-3.5z"}
      ></path>

      <circle cx={"10"} cy={"10"} r={"1"} fill={"currentColor"}></circle>

      <circle cx={"14"} cy={"10"} r={"1"} fill={"currentColor"}></circle>
    </svg>
  );
}

export default BuildingsvgIcon;
/* prettier-ignore-end */
