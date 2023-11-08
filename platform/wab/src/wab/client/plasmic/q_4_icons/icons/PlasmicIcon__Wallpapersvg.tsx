// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type WallpapersvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WallpapersvgIcon(props: WallpapersvgIconProps) {
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
          "M9.25 17a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM4.75 7a2.25 2.25 0 014.5 0m0 0v10"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M7 19.25h11.25a1 1 0 001-1V7.75a1 1 0 00-1-1H9.5M4.75 17V7"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default WallpapersvgIcon;
/* prettier-ignore-end */
