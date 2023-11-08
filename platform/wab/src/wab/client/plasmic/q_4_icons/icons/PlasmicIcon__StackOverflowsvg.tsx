// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type StackOverflowsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StackOverflowsvgIcon(props: StackOverflowsvgIconProps) {
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

      <g
        clipPath={"url(#-GIQxZvvNa)"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      >
        <path
          d={
            "M4.75 17v1.25a1 1 0 001 1h12.5a1 1 0 001-1V17m-11.5-.75h8.5m-7.852-3.527l8.442.991M9.506 9.149l8.227 2.14m-6.319-5.534l7.836 3.294"
          }
        ></path>
      </g>

      <defs>
        <clipPath id={"-GIQxZvvNa"}>
          <path fill={"#fff"} d={"M0 0h24v24H0z"}></path>
        </clipPath>
      </defs>
    </svg>
  );
}

export default StackOverflowsvgIcon;
/* prettier-ignore-end */
