// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FilePlussvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FilePlussvgIcon(props: FilePlussvgIconProps) {
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
          "M11.25 19.25h-3.5a2 2 0 01-2-2V6.75a2 2 0 012-2H14L18.25 9v2.25M17 14.75v4.5M19.25 17h-4.5"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M18 9.25h-4.25V5"}
      ></path>
    </svg>
  );
}

export default FilePlussvgIcon;
/* prettier-ignore-end */
