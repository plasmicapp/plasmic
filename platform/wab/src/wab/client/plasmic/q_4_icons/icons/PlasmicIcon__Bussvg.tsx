// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BussvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BussvgIcon(props: BussvgIconProps) {
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
          "M5.75 6.75a2 2 0 012-2h8.5a2 2 0 012 2v9.5a1 1 0 01-1 1H6.75a1 1 0 01-1-1v-9.5zm-.25 3.5a.75.75 0 010-1.5m13 1.5a.75.75 0 000-1.5M7.75 18v1.25m8.5-1.25v1.25M6 11.25h12m-6 0V5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M9.5 14a.5.5 0 11-1 0 .5.5 0 011 0zm6 0a.5.5 0 11-1 0 .5.5 0 011 0z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BussvgIcon;
/* prettier-ignore-end */
