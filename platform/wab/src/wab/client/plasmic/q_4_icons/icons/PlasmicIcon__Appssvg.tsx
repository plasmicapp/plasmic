// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type AppssvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AppssvgIcon(props: AppssvgIconProps) {
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
          "M4.75 6.75v1.5a2 2 0 002 2h1.5a2 2 0 002-2v-1.5a2 2 0 00-2-2h-1.5a2 2 0 00-2 2zm10 .25h4.5M17 4.75v4.5m-12.25 6.5v1.5a2 2 0 002 2h1.5a2 2 0 002-2v-1.5a2 2 0 00-2-2h-1.5a2 2 0 00-2 2zm9 0v1.5a2 2 0 002 2h1.5a2 2 0 002-2v-1.5a2 2 0 00-2-2h-1.5a2 2 0 00-2 2z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default AppssvgIcon;
/* prettier-ignore-end */
