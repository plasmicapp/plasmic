// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type LineHeightSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LineHeightSvgIcon(props: LineHeightSvgIconProps) {
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
          "M19.25 12h-5.5m5.5 5.25h-5.5m5.5-10.5h-5.5m-8 .5L8 4.75l2.25 2.5m-4.5 9.5L8 19.25l2.25-2.5M8 5.5v13"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default LineHeightSvgIcon;
/* prettier-ignore-end */
