// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type EmojiNeutralsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EmojiNeutralsvgIcon(props: EmojiNeutralsvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M8.75 4.75h6.5a4 4 0 014 4v6.5a4 4 0 01-4 4h-6.5a4 4 0 01-4-4v-6.5a4 4 0 014-4z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M14.5 10a.5.5 0 11-1 0 .5.5 0 011 0zm-4 0a.5.5 0 11-1 0 .5.5 0 011 0z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M8.75 14.25h6.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default EmojiNeutralsvgIcon;
/* prettier-ignore-end */
