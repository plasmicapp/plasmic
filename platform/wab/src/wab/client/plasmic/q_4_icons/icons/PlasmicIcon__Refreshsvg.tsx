// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type RefreshsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RefreshsvgIcon(props: RefreshsvgIconProps) {
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
        d={"M11.25 4.75L8.75 7l2.5 2.25m1.5 10l2.5-2.25-2.5-2.25"}
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M9.75 7h3.5a6 6 0 016 6v.25m-5 3.75h-3.5a6 6 0 01-6-6v-.25"}
      ></path>
    </svg>
  );
}

export default RefreshsvgIcon;
/* prettier-ignore-end */
