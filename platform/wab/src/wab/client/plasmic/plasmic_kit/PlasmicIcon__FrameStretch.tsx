/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FrameStretchIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FrameStretchIcon(props: FrameStretchIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 64 64"}
      height={"1em"}
      width={"1em"}
      style={{
        fill: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M57.875 12c1.174 0 2.125.951 2.125 2.125V20a2 2 0 11-4 0v-4h-4a2 2 0 110-4h5.875zM11 21a2 2 0 012-2h38a2 2 0 012 2v22a2 2 0 01-2 2H13a2 2 0 01-2-2V21zM4 49.875C4 51.049 4.951 52 6.125 52H12a2 2 0 100-4H8v-4a2 2 0 10-4 0v5.875zm56 0A2.125 2.125 0 0157.875 52H52a2 2 0 110-4h4v-4a2 2 0 114 0v5.875zM6.125 12A2.125 2.125 0 004 14.125V20a2 2 0 104 0v-4h4a2 2 0 100-4H6.125z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default FrameStretchIcon;
/* prettier-ignore-end */
