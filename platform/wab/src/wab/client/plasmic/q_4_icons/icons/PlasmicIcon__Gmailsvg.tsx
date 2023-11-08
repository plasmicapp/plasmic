// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GmailsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GmailsvgIcon(props: GmailsvgIconProps) {
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
          "M4.75 6.75a2 2 0 012-2h1.5v14.5h-1.5a2 2 0 01-2-2V6.75zm14.5 0a2 2 0 00-2-2h-1.5v14.5h1.5a2 2 0 002-2V6.75zm-11-2L12 9.25l3.75-4.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M19 8.25l-7 7-7-7"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GmailsvgIcon;
/* prettier-ignore-end */
