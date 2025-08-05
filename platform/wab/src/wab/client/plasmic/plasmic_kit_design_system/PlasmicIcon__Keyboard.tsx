/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type KeyboardIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function KeyboardIcon(props: KeyboardIconProps) {
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
          "M4.75 6.75v10.5a2 2 0 002 2h10.5a2 2 0 002-2V6.75a2 2 0 00-2-2H6.75a2 2 0 00-2 2z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M8.5 8a.5.5 0 11-1 0 .5.5 0 011 0zm0 4a.5.5 0 11-1 0 .5.5 0 011 0zm4-4a.5.5 0 11-1 0 .5.5 0 011 0zm0 4a.5.5 0 11-1 0 .5.5 0 011 0zm4-4a.5.5 0 11-1 0 .5.5 0 011 0zm0 4a.5.5 0 11-1 0 .5.5 0 011 0z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M7.75 16.25h8.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default KeyboardIcon;
/* prettier-ignore-end */
