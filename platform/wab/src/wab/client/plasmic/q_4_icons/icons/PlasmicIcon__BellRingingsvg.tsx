// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BellRingingsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BellRingingsvgIcon(props: BellRingingsvgIconProps) {
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
          "M17.25 12v-2a5.25 5.25 0 10-10.5 0v2l-2 4.25h14.5l-2-4.25zM9 16.5s0 2.75 3 2.75 3-2.75 3-2.75m2.75-11.75s.648.148 1 .5.5 1 .5 1m-13-1.5s-.648.148-1 .5-.5 1-.5 1"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BellRingingsvgIcon;
/* prettier-ignore-end */
