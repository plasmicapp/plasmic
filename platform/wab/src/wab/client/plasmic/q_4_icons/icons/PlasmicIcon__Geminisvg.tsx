// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GeminisvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GeminisvgIcon(props: GeminisvgIconProps) {
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
          "M4.75 19.25S7 17.75 12 17.75s7.25 1.5 7.25 1.5M4.75 4.75S7 6.25 12 6.25s7.25-1.5 7.25-1.5M8.75 6.5v11m6.5-11v11"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GeminisvgIcon;
/* prettier-ignore-end */
