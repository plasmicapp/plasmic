/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type LogInSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LogInSvgIcon(props: LogInSvgIconProps) {
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
        d={"M9.75 8.75l3.5 3.25-3.5 3.25"}
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M9.75 4.75h7.5a2 2 0 012 2v10.5a2 2 0 01-2 2h-7.5M13 12H4.75"}
      ></path>
    </svg>
  );
}

export default LogInSvgIcon;
/* prettier-ignore-end */
