/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CheckCircleSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CheckCircleSvgIcon(props: CheckCircleSvgIconProps) {
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
          "M4.75 12A7.25 7.25 0 0112 4.75v0A7.25 7.25 0 0119.25 12v0A7.25 7.25 0 0112 19.25v0A7.25 7.25 0 014.75 12v0z"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M9.75 12.75l.434.924a1 1 0 001.772.073L14.25 9.75"}
      ></path>
    </svg>
  );
}

export default CheckCircleSvgIcon;
/* prettier-ignore-end */
