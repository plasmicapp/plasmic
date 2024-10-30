// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BringForwardSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BringForwardSvgIcon(props: BringForwardSvgIconProps) {
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
          "M4.75 9.75v.5m0 3.5v.5m0 3.5v.5a1 1 0 001 1h.5m3.5 0h.5m3.5 0h.5m-3.5-4h6.5a2 2 0 002-2v-6.5a2 2 0 00-2-2h-6.5a2 2 0 00-2 2v6.5a2 2 0 002 2z"
        }
      ></path>
    </svg>
  );
}

export default BringForwardSvgIcon;
/* prettier-ignore-end */
