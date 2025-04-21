/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PictureInPictureSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PictureInPictureSvgIcon(props: PictureInPictureSvgIconProps) {
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
        d={"M7.25 17.25h-.5a2 2 0 01-2-2v-8.5a2 2 0 012-2h10.5a2 2 0 012 2v2.5"}
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M10.75 13.75a1 1 0 011-1h6.5a1 1 0 011 1v4.5a1 1 0 01-1 1h-6.5a1 1 0 01-1-1v-4.5z"
        }
      ></path>
    </svg>
  );
}

export default PictureInPictureSvgIcon;
/* prettier-ignore-end */
