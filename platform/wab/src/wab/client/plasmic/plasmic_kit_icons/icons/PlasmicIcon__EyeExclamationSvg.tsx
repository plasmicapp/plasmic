/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type EyeExclamationSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EyeExclamationSvgIcon(props: EyeExclamationSvgIconProps) {
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
        d={"M6.667 8a1.333 1.333 0 102.666 0 1.333 1.333 0 00-2.666 0z"}
        stroke={"currentColor"}
        strokeWidth={"1.25"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M10.02 11.652A5.864 5.864 0 018 12c-2.4 0-4.4-1.333-6-4 1.6-2.667 3.6-4 6-4s4.4 1.333 6 4c-.056.094-.114.187-.172.28m-1.161 2.387v2m0 2v.006"
        }
        stroke={"currentColor"}
        strokeWidth={"1.25"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default EyeExclamationSvgIcon;
/* prettier-ignore-end */
