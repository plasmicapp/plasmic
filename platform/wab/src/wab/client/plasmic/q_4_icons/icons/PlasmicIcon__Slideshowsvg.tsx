// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SlideshowsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SlideshowsvgIcon(props: SlideshowsvgIconProps) {
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
          "M4.75 4.75h14.5m-14.5 14.5h14.5m-12.5-3h10.5a2 2 0 002-2v-4.5a2 2 0 00-2-2H6.75a2 2 0 00-2 2v4.5a2 2 0 002 2z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SlideshowsvgIcon;
/* prettier-ignore-end */
