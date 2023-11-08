// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type StreamToTvsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StreamToTvsvgIcon(props: StreamToTvsvgIconProps) {
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
        d={"M4.75 8.25v-.5a2 2 0 012-2h10.5a2 2 0 012 2v8.5a2 2 0 01-2 2h-2.5"}
      ></path>

      <path
        stroke={"currentColor"}
        d={"M5.5 18a.5.5 0 11-1 0 .5.5 0 011 0z"}
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M8.25 18.25c0-2-1.5-3.5-3.5-3.5m6.5 3.5c0-3.714-2.786-6.5-6.5-6.5"}
      ></path>
    </svg>
  );
}

export default StreamToTvsvgIcon;
/* prettier-ignore-end */
