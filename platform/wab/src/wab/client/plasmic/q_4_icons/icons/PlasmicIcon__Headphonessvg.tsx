// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type HeadphonessvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HeadphonessvgIcon(props: HeadphonessvgIconProps) {
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
        d={"M19.25 16v-3.75A7.25 7.25 0 0012 5v0a7.25 7.25 0 00-7.25 7.25V16"}
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M4.75 15.45a2.7 2.7 0 012.7-2.7v0a1.8 1.8 0 011.8 1.8v2.9a1.8 1.8 0 01-1.8 1.8v0a2.7 2.7 0 01-2.7-2.7v-1.1zm10-.9a1.8 1.8 0 011.8-1.8v0a2.7 2.7 0 012.7 2.7v1.1a2.7 2.7 0 01-2.7 2.7v0a1.8 1.8 0 01-1.8-1.8v-2.9z"
        }
      ></path>
    </svg>
  );
}

export default HeadphonessvgIcon;
/* prettier-ignore-end */
