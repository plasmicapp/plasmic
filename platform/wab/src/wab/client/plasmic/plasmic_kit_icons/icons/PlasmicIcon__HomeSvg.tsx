/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type HomeSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HomeSvgIcon(props: HomeSvgIconProps) {
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
        d={"M6.75 19.25h10.5a2 2 0 002-2v-7.5l-7.25-5-7.25 5v7.5a2 2 0 002 2z"}
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M9.75 15.75a2 2 0 012-2h.5a2 2 0 012 2v3.5h-4.5v-3.5z"}
      ></path>
    </svg>
  );
}

export default HomeSvgIcon;
/* prettier-ignore-end */
