/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FunctionSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FunctionSvgIcon(props: FunctionSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentColor"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path fill={"none"} d={"M0 0h24v24H0z"}></path>

      <path
        fill={"none"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M5 19c.264.956.797 2 2.187 2 2.407 0 3.008-2 4.813-9s2.406-9 4.813-9c1.39 0 1.923 1.044 2.187 2M9 10h8"
        }
      ></path>
    </svg>
  );
}

export default FunctionSvgIcon;
/* prettier-ignore-end */
