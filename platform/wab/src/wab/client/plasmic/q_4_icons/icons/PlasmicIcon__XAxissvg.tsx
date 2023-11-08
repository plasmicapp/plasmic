// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type XAxissvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function XAxissvgIcon(props: XAxissvgIconProps) {
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
        d={
          "M4.75 4.75v.5m0 2.5v.5m0 2.5v.5m0 2.5v.5m0 2.75h14.5m0 0l-2.5-2.25m2.5 2.25l-2.5 2.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default XAxissvgIcon;
/* prettier-ignore-end */
