// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SlidersHorizontalSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SlidersHorizontalSvgIcon(props: SlidersHorizontalSvgIconProps) {
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
          "M4.75 5.75h6.5m-6.5 12.5h6.5M4.75 12h2.5M15 5.75h4.25M15 18.25h4.25M11 12h8.25m-4.5-7.25v2.5m0 9.5v2.5m-4-8.5v2.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SlidersHorizontalSvgIcon;
/* prettier-ignore-end */
