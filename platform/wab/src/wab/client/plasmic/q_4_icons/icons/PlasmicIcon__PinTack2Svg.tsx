// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PinTack2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PinTack2SvgIcon(props: PinTack2SvgIconProps) {
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
          "M15.75 5.75l2.5 2.5m-2.5-2.5L8 10m7.75-4.25l-1-1m3.5 3.5L14 16m4.25-7.75l1 1m-12.5-.5l8.5 8.5M11 13l-6.25 6.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PinTack2SvgIcon;
/* prettier-ignore-end */
