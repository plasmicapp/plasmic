/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CurlyBracesIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CurlyBracesIcon(props: CurlyBracesIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      xmlnsXlink={"http://www.w3.org/1999/xlink"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <g
        stroke={"currentcolor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        clipPath={"url(#a)"}
      >
        <path
          d={
            "M7 4a2 2 0 0 0-2 2v3c0 .796-.21 1.559-.586 2.121C4.04 11.684 3.53 12 3 12c.53 0 1.04.316 1.414.879C4.79 13.44 5 14.204 5 15v3a2 2 0 0 0 2 2M17 4a2 2 0 0 1 2 2v3c0 .796.21 1.559.586 2.121.375.563.884.879 1.414.879-.53 0-1.04.316-1.414.879C19.21 13.44 19 14.204 19 15v3a2 2 0 0 1-2 2"
          }
        ></path>
      </g>

      <defs>
        <clipPath id={"a"}>
          <path fill={"#fff"} d={"M0 0h24v24H0z"}></path>
        </clipPath>
      </defs>
    </svg>
  );
}

export default CurlyBracesIcon;
/* prettier-ignore-end */
