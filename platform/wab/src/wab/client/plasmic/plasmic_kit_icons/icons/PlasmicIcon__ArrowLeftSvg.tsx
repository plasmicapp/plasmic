/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ArrowLeftSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowLeftSvgIcon(props: ArrowLeftSvgIconProps) {
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
        d={"M10.25 6.75L4.75 12l5.5 5.25m9-5.25H5"}
      ></path>
    </svg>
  );
}

export default ArrowLeftSvgIcon;
/* prettier-ignore-end */
