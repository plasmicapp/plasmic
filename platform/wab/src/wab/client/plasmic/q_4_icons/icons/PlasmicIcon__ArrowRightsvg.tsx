// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ArrowRightsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowRightsvgIcon(props: ArrowRightsvgIconProps) {
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
        d={"M13.75 6.75l5.5 5.25-5.5 5.25M19 12H4.75"}
      ></path>
    </svg>
  );
}

export default ArrowRightsvgIcon;
/* prettier-ignore-end */
