/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PaintBucketFillIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PaintBucketFillIcon(props: PaintBucketFillIconProps) {
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
        clipPath={"url(#aUCaepx2Ba)"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      >
        <path
          d={
            "M15.846 10.999c-.87.83-2.862.187-4.45-1.439-1.587-1.625-2.168-3.616-1.298-4.447m5.748 5.886c.87-.831.289-2.822-1.298-4.448-1.588-1.625-3.58-2.269-4.45-1.438m5.748 5.886l-4.944 4.888c-.87.83-2.862.187-4.45-1.438C4.867 12.823 4.285 10.832 5.155 10l4.944-4.888m9.151 12.531c0 .887-.784 1.607-1.75 1.607s-1.75-.72-1.75-1.607c0-.888 1.75-2.893 1.75-2.893s1.75 2.005 1.75 2.893z"
          }
        ></path>
      </g>

      <defs>
        <clipPath id={"aUCaepx2Ba"}>
          <path fill={"#fff"} d={"M0 0h24v24H0z"}></path>
        </clipPath>
      </defs>
    </svg>
  );
}

export default PaintBucketFillIcon;
/* prettier-ignore-end */
