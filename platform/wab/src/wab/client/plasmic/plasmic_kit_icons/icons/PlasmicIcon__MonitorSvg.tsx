/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type MonitorSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MonitorSvgIcon(props: MonitorSvgIconProps) {
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
          "M4.75 6.75a2 2 0 012-2h10.5a2 2 0 012 2v7.5a2 2 0 01-2 2H6.75a2 2 0 01-2-2v-7.5zm10.5 12.5l-3.25-2-3.25 2"
        }
      ></path>
    </svg>
  );
}

export default MonitorSvgIcon;
/* prettier-ignore-end */
