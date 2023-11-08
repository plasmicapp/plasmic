// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ArrowUpsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowUpsvgIcon(props: ArrowUpsvgIconProps) {
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
        d={"M17.25 10.25L12 4.75l-5.25 5.5m5.25 9V5.75"}
      ></path>
    </svg>
  );
}

export default ArrowUpsvgIcon;
/* prettier-ignore-end */
