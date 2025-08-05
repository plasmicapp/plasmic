/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Share3SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Share3SvgIcon(props: Share3SvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 16 17"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M5.333 6.5h-.667a1.333 1.333 0 00-1.333 1.333v5.334A1.333 1.333 0 004.666 14.5h6.667a1.333 1.333 0 001.333-1.333V7.833A1.333 1.333 0 0011.333 6.5h-.667M8 9.833V2.5m-2 2l2-2 2 2"
        }
        stroke={"currentColor"}
        strokeWidth={"1.25"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Share3SvgIcon;
/* prettier-ignore-end */
