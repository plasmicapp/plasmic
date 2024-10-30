// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type StampSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StampSvgIcon(props: StampSvgIconProps) {
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
        clipPath={"url(#aIm0Tfrz_a)"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      >
        <path
          d={
            "M5.75 14.75a3 3 0 013-3h6.5a3 3 0 013 3v1.5H5.75v-1.5zM10 11.5L8.969 5.932a1 1 0 01.983-1.182h4.096a1 1 0 01.983 1.182L14 11.5m-9.25 7.75h14.5"
          }
        ></path>
      </g>

      <defs>
        <clipPath id={"aIm0Tfrz_a"}>
          <path fill={"#fff"} d={"M0 0h24v24H0z"}></path>
        </clipPath>
      </defs>
    </svg>
  );
}

export default StampSvgIcon;
/* prettier-ignore-end */
