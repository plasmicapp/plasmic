// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Share2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Share2SvgIcon(props: Share2SvgIconProps) {
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
          "M19.25 7a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-10 5a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm10 5a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-4.75-1L9 13.5m5.5-5L9 11"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Share2SvgIcon;
/* prettier-ignore-end */
