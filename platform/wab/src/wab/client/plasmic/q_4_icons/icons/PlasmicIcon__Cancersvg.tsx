// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type CancersvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CancersvgIcon(props: CancersvgIconProps) {
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
          "M4.75 17.75S7 19.25 12 19.25c2.172 0 3.89-.445 5.602-1.078M19.25 6.25S17 4.75 12 4.75c-2.172 0-3.89.445-5.602 1.078"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M19.25 16a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM4.75 8a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CancersvgIcon;
/* prettier-ignore-end */
