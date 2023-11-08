// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ArrowUpRightsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowUpRightsvgIcon(props: ArrowUpRightsvgIconProps) {
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
        d={"M17.25 15.25v-8.5h-8.5M17 7L6.75 17.25"}
      ></path>
    </svg>
  );
}

export default ArrowUpRightsvgIcon;
/* prettier-ignore-end */
