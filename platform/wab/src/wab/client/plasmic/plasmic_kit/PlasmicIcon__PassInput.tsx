/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PassInputIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PassInputIcon(props: PassInputIconProps) {
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
        d={"M19.25 7.25v-.5a2 2 0 00-2-2H6.75a2 2 0 00-2 2v4.5a2 2 0 002 2h2.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M17.25 13.5v-2a1.75 1.75 0 10-3.5 0v2m-2 1.25a1 1 0 011-1h5.5a1 1 0 011 1v3.5a1 1 0 01-1 1h-5.5a1 1 0 01-1-1v-3.5z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PassInputIcon;
/* prettier-ignore-end */
