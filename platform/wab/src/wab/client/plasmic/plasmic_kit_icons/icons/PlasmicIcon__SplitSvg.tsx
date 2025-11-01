/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SplitSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SplitSvgIcon(props: SplitSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentColor"}
      stroke={"currentColor"}
      strokeWidth={"0"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path fill={"none"} stroke={"none"} d={"M0 0h24v24H0z"}></path>

      <path
        stroke={"none"}
        d={
          "m14 4 2.29 2.29-2.88 2.88 1.42 1.42 2.88-2.88L20 10V4zm-4 0H4v6l2.29-2.29 4.71 4.7V20h2v-8.41l-5.29-5.3z"
        }
      ></path>
    </svg>
  );
}

export default SplitSvgIcon;
/* prettier-ignore-end */
