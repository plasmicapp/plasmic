// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PlanesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PlanesvgIcon(props: PlanesvgIconProps) {
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
          "M10 8.407a4 4 0 011.172-2.829L12 4.75l.828.828A4 4 0 0114 8.407v1.823l5.25 2.52v1.327a1 1 0 01-1.158.988L14 14.41v3.146l1.25.694v1h-6.5v-1l1.25-.625V14.41l-4.092.655a1 1 0 01-1.158-.988V12.75L10 10.23V8.407z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PlanesvgIcon;
/* prettier-ignore-end */
