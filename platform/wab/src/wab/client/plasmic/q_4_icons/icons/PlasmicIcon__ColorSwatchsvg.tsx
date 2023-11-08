// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ColorSwatchsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ColorSwatchsvgIcon(props: ColorSwatchsvgIconProps) {
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
        d={"M9.5 16a.5.5 0 11-1 0 .5.5 0 011 0z"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M4.75 6.75a2 2 0 012-2h4.5a2 2 0 012 2v10.5a2 2 0 01-2 2h-4.5a2 2 0 01-2-2V6.75zm11 8.5l2.93-2.992a2 2 0 00.028-2.77l-3.08-3.273c-.755-.803-2.438-.415-2.438-.415"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ColorSwatchsvgIcon;
/* prettier-ignore-end */
