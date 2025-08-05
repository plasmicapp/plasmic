/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BookmarkSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BookmarkSvgIcon(props: BookmarkSvgIconProps) {
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
        d={
          "M6.75 6.75a2 2 0 012-2h6.5a2 2 0 012 2v12.5L12 14.75l-5.25 4.5V6.75z"
        }
      ></path>
    </svg>
  );
}

export default BookmarkSvgIcon;
/* prettier-ignore-end */
