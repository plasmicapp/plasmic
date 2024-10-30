// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PillSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PillSvgIcon(props: PillSvgIconProps) {
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
          "M18.006 12L12 5.994A4.247 4.247 0 005.994 12L12 18.006A4.247 4.247 0 0018.006 12zM9 15l6-6"
        }
      ></path>
    </svg>
  );
}

export default PillSvgIcon;
/* prettier-ignore-end */
