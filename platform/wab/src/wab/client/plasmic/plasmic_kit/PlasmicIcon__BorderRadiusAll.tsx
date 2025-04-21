/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BorderRadiusAllIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BorderRadiusAllIcon(props: BorderRadiusAllIconProps) {
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
          "M4.75 9.25v-.5a4 4 0 014-4h.5m10 4.5v-.5a4 4 0 00-4-4h-.5m-5.5 14.5h-.5a4 4 0 01-4-4v-.5m10 4.5h.5a4 4 0 004-4v-.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BorderRadiusAllIcon;
/* prettier-ignore-end */
