/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Icon2IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon2Icon(props: Icon2IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      fill={"none"}
      xmlns={"http://www.w3.org/2000/svg"}
      viewBox={"0 0 16 16"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M5.333 6h-.666a1.333 1.333 0 00-1.334 1.333v5.334A1.333 1.333 0 004.667 14h6.666a1.334 1.334 0 001.334-1.333V7.333A1.334 1.334 0 0011.333 6h-.666M8 9.333V2M6 4l2-2 2 2"
        }
        stroke={"#60646C"}
        strokeWidth={"1.25"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Icon2Icon;
/* prettier-ignore-end */
