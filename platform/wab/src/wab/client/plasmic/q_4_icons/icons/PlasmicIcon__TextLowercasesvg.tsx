// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type TextLowercasesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TextLowercasesvgIcon(props: TextLowercasesvgIconProps) {
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
        d={
          "M19.25 9.5a2.75 2.75 0 11-5.5 0 2.75 2.75 0 015.5 0zm-9 0a2.75 2.75 0 11-5.5 0 2.75 2.75 0 015.5 0z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M19.25 6.75v6.5a4 4 0 01-4 4h-1.5m-3.5-10.5v5.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default TextLowercasesvgIcon;
/* prettier-ignore-end */
