/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FontFamily2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FontFamily2SvgIcon(props: FontFamily2SvgIconProps) {
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
          "M6.75 5.75h1.5m0 0h1m-1 0v6m0 0v6.5m0-6.5h5.5m-5.5 6.5h-1.5m1.5 0h1m-2.5-12.5h10.5v1.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FontFamily2SvgIcon;
/* prettier-ignore-end */
