/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BellSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BellSvgIcon(props: BellSvgIconProps) {
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
          "M17.25 12v-2a5.25 5.25 0 10-10.5 0v2l-2 4.25h14.5l-2-4.25zM9 16.75s0 2.5 3 2.5 3-2.5 3-2.5"
        }
      ></path>
    </svg>
  );
}

export default BellSvgIcon;
/* prettier-ignore-end */
