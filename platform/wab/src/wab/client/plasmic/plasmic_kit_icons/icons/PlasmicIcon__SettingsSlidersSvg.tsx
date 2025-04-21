/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SettingsSlidersSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SettingsSlidersSvgIcon(props: SettingsSlidersSvgIconProps) {
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
        d={"M4.75 8h2.5m5.5 0h6.5m-14.5 8h7.5m5.5 0h1.5"}
      ></path>

      <circle
        cx={"10"}
        cy={"8"}
        r={"2.25"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
      ></circle>

      <circle
        cx={"15"}
        cy={"16"}
        r={"2.25"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
      ></circle>
    </svg>
  );
}

export default SettingsSlidersSvgIcon;
/* prettier-ignore-end */
