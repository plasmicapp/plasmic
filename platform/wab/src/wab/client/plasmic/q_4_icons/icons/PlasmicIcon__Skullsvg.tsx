// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SkullsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SkullsvgIcon(props: SkullsvgIconProps) {
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
          "M4.75 12a7.25 7.25 0 0114.5 0v1.25a2 2 0 01-2 2h-1v3a1 1 0 01-1 1h-6.5a1 1 0 01-1-1v-3h-1a2 2 0 01-2-2V12z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M16.25 11a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zm-6 0a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zm.5 6.75v1.5m2.5-1.5v1.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SkullsvgIcon;
/* prettier-ignore-end */
