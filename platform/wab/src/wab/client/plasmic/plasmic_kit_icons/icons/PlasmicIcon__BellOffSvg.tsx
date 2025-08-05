/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BellOffSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BellOffSvgIcon(props: BellOffSvgIconProps) {
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
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M17.25 6.875V12l2 4.25H7.75m-2-2.125l1-2.125v-2c0-2.9 2.35-5.25 5.25-5.25 0 0 1.61 0 2.594.5M9 16.75s0 2.5 3 2.5 3-2.5 3-2.5m4.25-12l-14.5 14.5"
        }
      ></path>
    </svg>
  );
}

export default BellOffSvgIcon;
/* prettier-ignore-end */
