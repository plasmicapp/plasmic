// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FileSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FileSvgIcon(props: FileSvgIconProps) {
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
          "M7.75 19.25h8.5a2 2 0 002-2V9L14 4.75H7.75a2 2 0 00-2 2v10.5a2 2 0 002 2z"
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

export default FileSvgIcon;
/* prettier-ignore-end */
