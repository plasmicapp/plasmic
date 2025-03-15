// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CheckedCheckboxSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CheckedCheckboxSvgIcon(props: CheckedCheckboxSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 16 16"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={"M6 7.333l2 2L13.333 4"}
        stroke={"currentColor"}
        strokeWidth={"1.25"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M13.333 8v4A1.333 1.333 0 0112 13.333H4A1.333 1.333 0 012.667 12V4A1.333 1.333 0 014 2.667h6"
        }
        stroke={"currentColor"}
        strokeWidth={"1.25"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CheckedCheckboxSvgIcon;
/* prettier-ignore-end */
