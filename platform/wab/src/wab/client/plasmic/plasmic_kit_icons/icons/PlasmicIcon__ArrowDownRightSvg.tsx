// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ArrowDownRightSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowDownRightSvgIcon(props: ArrowDownRightSvgIconProps) {
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
        d={"M17.25 8.75v8.5h-8.5M17 17L6.75 6.75"}
      ></path>
    </svg>
  );
}

export default ArrowDownRightSvgIcon;
/* prettier-ignore-end */
