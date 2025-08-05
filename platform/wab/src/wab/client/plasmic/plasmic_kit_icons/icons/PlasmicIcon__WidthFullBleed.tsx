/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type WidthFullBleedIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WidthFullBleedIcon(props: WidthFullBleedIconProps) {
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
          "M4.75 4.75v14.5m14.5-14.5v14.5m-11-10.5L4.75 12l3.5 3.25m7.5-6.5l3.5 3.25-3.5 3.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default WidthFullBleedIcon;
/* prettier-ignore-end */
