// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type RssFeedsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RssFeedsvgIcon(props: RssFeedsvgIconProps) {
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
        d={"M5.5 19a.5.5 0 11-1 0 .5.5 0 011 0z"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M4.75 12.75H5A6.25 6.25 0 0111.25 19v.25m-6.5-12.5H5c6.765 0 12.25 5.485 12.25 12.25v.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default RssFeedsvgIcon;
/* prettier-ignore-end */
