/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type EmojiHappySvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EmojiHappySvgIcon(props: EmojiHappySvgIconProps) {
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
          "M8.75 4.75h6.5a4 4 0 014 4v6.5a4 4 0 01-4 4h-6.5a4 4 0 01-4-4v-6.5a4 4 0 014-4z"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M7.75 12.75S9 15.25 12 15.25s4.25-2.5 4.25-2.5"}
      ></path>

      <circle cx={"14"} cy={"10"} r={"1"} fill={"currentColor"}></circle>

      <circle cx={"10"} cy={"10"} r={"1"} fill={"currentColor"}></circle>
    </svg>
  );
}

export default EmojiHappySvgIcon;
/* prettier-ignore-end */
