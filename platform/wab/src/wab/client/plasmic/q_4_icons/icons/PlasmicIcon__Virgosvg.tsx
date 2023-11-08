// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type VirgosvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function VirgosvgIcon(props: VirgosvgIconProps) {
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
          "M4.75 4.75s1.5-.093 1.5 2.25v6.25m4 2V7a2 2 0 10-4 0v8.25m5 4c5.481 0 6.71-4.627 6.96-7.336.1-1.08-.795-1.914-1.88-1.914-1.148 0-2.08.932-2.08 2.08v2.17"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M10.25 15.25V7a2 2 0 114 0v8.25s0 4 5 4"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default VirgosvgIcon;
/* prettier-ignore-end */
