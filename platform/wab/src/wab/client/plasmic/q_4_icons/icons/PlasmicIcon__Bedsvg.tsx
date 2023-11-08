// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BedsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BedsvgIcon(props: BedsvgIconProps) {
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
          "M4.75 18.25V12S7.5 10.75 12 10.75 19.25 12 19.25 12v6.25m-14.5 0h14.5m-14.5 0v1m14.5-1v1m-13.5-10v-3.5m0 0h12.5m-12.5 0v-1m12.5 1v3.5m0-3.5v-1"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BedsvgIcon;
/* prettier-ignore-end */
