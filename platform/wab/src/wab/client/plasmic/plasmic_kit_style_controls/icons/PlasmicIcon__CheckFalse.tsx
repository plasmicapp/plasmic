/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CheckFalseIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CheckFalseIcon(props: CheckFalseIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentcolor"}
      viewBox={"0 0 64 64"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fillRule={"evenodd"}
        clipRule={"evenodd"}
        d={
          "M10 18a8 8 0 018-8h28a8 8 0 018 8v28a8 8 0 01-8 8H18a8 8 0 01-8-8V18zm8-4a4 4 0 00-4 4v28a4 4 0 004 4h28a4 4 0 004-4V18a4 4 0 00-4-4H18z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default CheckFalseIcon;
/* prettier-ignore-end */
