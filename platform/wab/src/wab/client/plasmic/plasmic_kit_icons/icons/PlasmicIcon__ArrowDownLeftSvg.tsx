/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ArrowDownLeftSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowDownLeftSvgIcon(props: ArrowDownLeftSvgIconProps) {
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
        d={"M6.75 8.75v8.5h8.5M7 17L17.25 6.75"}
      ></path>
    </svg>
  );
}

export default ArrowDownLeftSvgIcon;
/* prettier-ignore-end */
