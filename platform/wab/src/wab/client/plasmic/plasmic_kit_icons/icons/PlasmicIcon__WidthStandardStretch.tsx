/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type WidthStandardStretchIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WidthStandardStretchIcon(props: WidthStandardStretchIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M10.25 8.75L6.75 12l3.5 3.25m3.5-6.5l3.5 3.25-3.5 3.25m-9-4.5v2.5m14.5-2.5v2.5m-14.5-8.5v2.5m14.5-2.5v2.5m-14.5 9.5v2.5m14.5-2.5v2.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default WidthStandardStretchIcon;
/* prettier-ignore-end */
