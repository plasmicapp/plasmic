// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type HomeIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HomeIcon(props: HomeIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 20 20"}
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
          "M5.625 16.042h8.75c.92 0 1.667-.746 1.667-1.667v-6.25L10 3.96 3.96 8.125v6.25c0 .92.746 1.667 1.666 1.667z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.25"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M8.125 13.124c0-.92.746-1.666 1.666-1.666h.417c.92 0 1.667.746 1.667 1.666v2.917h-3.75v-2.917z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.25"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default HomeIcon;
/* prettier-ignore-end */
