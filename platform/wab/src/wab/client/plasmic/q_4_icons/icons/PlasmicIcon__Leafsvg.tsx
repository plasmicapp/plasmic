// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type LeafsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LeafsvgIcon(props: LeafsvgIconProps) {
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
          "M4.75 13c0-5.6 14.5-8.25 14.5-8.25s-1 14.5-7.25 14.5C8 19.25 4.75 17 4.75 13zm0 6.25S8 14 12.25 11.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default LeafsvgIcon;
/* prettier-ignore-end */
