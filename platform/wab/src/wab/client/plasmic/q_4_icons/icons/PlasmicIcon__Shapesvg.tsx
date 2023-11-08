// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ShapesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ShapesvgIcon(props: ShapesvgIconProps) {
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
          "M4.75 5.75v1.5a1 1 0 001 1h1.5a1 1 0 001-1v-1.5a1 1 0 00-1-1h-1.5a1 1 0 00-1 1zm0 11v1.5a1 1 0 001 1h1.5a1 1 0 001-1v-1.5a1 1 0 00-1-1h-1.5a1 1 0 00-1 1zm11-11v1.5a1 1 0 001 1h1.5a1 1 0 001-1v-1.5a1 1 0 00-1-1h-1.5a1 1 0 00-1 1zm0 11v1.5a1 1 0 001 1h1.5a1 1 0 001-1v-1.5a1 1 0 00-1-1h-1.5a1 1 0 00-1 1zm-9-8.25v7m10.5-7v7m-1.75 1.75h-7m7-10.5h-7"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ShapesvgIcon;
/* prettier-ignore-end */
