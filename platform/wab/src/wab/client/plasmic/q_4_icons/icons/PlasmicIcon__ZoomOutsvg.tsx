// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ZoomOutsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ZoomOutsvgIcon(props: ZoomOutsvgIconProps) {
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

      <circle
        cx={"11"}
        cy={"11"}
        r={"6.25"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
      ></circle>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M15.5 15.5l3.75 3.75m-6-8.25h-4.5"}
      ></path>
    </svg>
  );
}

export default ZoomOutsvgIcon;
/* prettier-ignore-end */
