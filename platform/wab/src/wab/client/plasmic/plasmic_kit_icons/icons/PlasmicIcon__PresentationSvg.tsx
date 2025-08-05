/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PresentationSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PresentationSvgIcon(props: PresentationSvgIconProps) {
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
          "M5.75 4.75h12.5m-12.5 0v8.5a2 2 0 002 2H10M5.75 4.75h-1m13.5 0v8.5a2 2 0 01-2 2H14m4.25-10.5h1M10 15.25l-1.25 4m1.25-4h4m0 0l1.25 4"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M8.75 12.25L11 9.75l2 2.5 2.25-4.5"}
      ></path>
    </svg>
  );
}

export default PresentationSvgIcon;
/* prettier-ignore-end */
