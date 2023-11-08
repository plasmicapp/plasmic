// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FullscreensvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FullscreensvgIcon(props: FullscreensvgIconProps) {
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
          "M4.75 6.75v10.5a2 2 0 002 2h10.5a2 2 0 002-2V6.75a2 2 0 00-2-2H6.75a2 2 0 00-2 2zm7.5 5l-4.5 4.5m4-4l4.5-4.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M7.75 12.75v3.5h3.5m5-5v-3.5h-3.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FullscreensvgIcon;
/* prettier-ignore-end */
