// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type RoundedCornersBrsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RoundedCornersBrsvgIcon(props: RoundedCornersBrsvgIconProps) {
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
          "M9.5 5a.5.5 0 11-1 0 .5.5 0 011 0zm-4 12a.5.5 0 11-1 0 .5.5 0 011 0zm0-12a.5.5 0 11-1 0 .5.5 0 011 0zm0 4a.5.5 0 11-1 0 .5.5 0 011 0zm0 4a.5.5 0 11-1 0 .5.5 0 011 0zm12-8a.5.5 0 11-1 0 .5.5 0 011 0zm-4 0a.5.5 0 11-1 0 .5.5 0 011 0z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M10.75 19.25h2.5a6 6 0 006-6v-2.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default RoundedCornersBrsvgIcon;
/* prettier-ignore-end */
