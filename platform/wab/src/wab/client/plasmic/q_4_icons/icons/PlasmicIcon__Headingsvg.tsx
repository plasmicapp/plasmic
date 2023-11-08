// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type HeadingsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HeadingsvgIcon(props: HeadingsvgIconProps) {
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
          "M5.75 5.75h1.5m0 0h1m-1 0v6m0 6.5h-1.5m1.5 0h1m-1 0v-6.5m0 0h9.5m0 0v-6m0 6v6.5m1.5-12.5h-1.5m0 0h-1m1 12.5h1.5m-1.5 0h-1"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default HeadingsvgIcon;
/* prettier-ignore-end */
