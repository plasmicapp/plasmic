// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type RoundedCornersBlsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RoundedCornersBlsvgIcon(props: RoundedCornersBlsvgIconProps) {
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
          "M11.5 5a.5.5 0 11-1 0 .5.5 0 011 0zm8 12a.5.5 0 11-1 0 .5.5 0 011 0zM7.5 5a.5.5 0 11-1 0 .5.5 0 011 0zm12 4a.5.5 0 11-1 0 .5.5 0 011 0zm0 4a.5.5 0 11-1 0 .5.5 0 011 0zm0-8a.5.5 0 11-1 0 .5.5 0 011 0zm-4 0a.5.5 0 11-1 0 .5.5 0 011 0z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M13.25 19.25h-2.5a6 6 0 01-6-6v-2.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default RoundedCornersBlsvgIcon;
/* prettier-ignore-end */
