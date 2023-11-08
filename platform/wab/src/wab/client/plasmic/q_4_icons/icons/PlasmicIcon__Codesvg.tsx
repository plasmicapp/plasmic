// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type CodesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CodesvgIcon(props: CodesvgIconProps) {
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

      <rect
        width={"14.5"}
        height={"14.5"}
        x={"4.75"}
        y={"4.75"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        rx={"2"}
      ></rect>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M8.75 10.75l2.5 2.25-2.5 2.25"}
      ></path>
    </svg>
  );
}

export default CodesvgIcon;
/* prettier-ignore-end */
