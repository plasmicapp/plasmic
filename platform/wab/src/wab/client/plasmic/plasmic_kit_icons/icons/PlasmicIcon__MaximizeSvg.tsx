/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type MaximizeSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MaximizeSvgIcon(props: MaximizeSvgIconProps) {
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
          "M4.75 14.75v2.5a2 2 0 002 2h2.5m10-4.5v2.5a2 2 0 01-2 2h-2.5m4.5-10v-2.5a2 2 0 00-2-2h-2.5m-10 4.5v-2.5a2 2 0 012-2h2.5"
        }
      ></path>
    </svg>
  );
}

export default MaximizeSvgIcon;
/* prettier-ignore-end */
