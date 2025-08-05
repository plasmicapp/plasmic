/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ZipFile2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ZipFile2SvgIcon(props: ZipFile2SvgIconProps) {
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
          "M17.25 4.75H6.75a2 2 0 00-2 2v10.5a2 2 0 002 2h10.5a2 2 0 002-2V6.75a2 2 0 00-2-2z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M9.5 6a.5.5 0 11-1 0 .5.5 0 011 0zm2 2a.5.5 0 11-1 0 .5.5 0 011 0zm-2 2a.5.5 0 11-1 0 .5.5 0 011 0zm2 2a.5.5 0 11-1 0 .5.5 0 011 0z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ZipFile2SvgIcon;
/* prettier-ignore-end */
