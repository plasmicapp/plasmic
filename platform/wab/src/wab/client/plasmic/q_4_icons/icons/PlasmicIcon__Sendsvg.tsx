// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SendsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SendsvgIcon(props: SendsvgIconProps) {
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
        d={"M4.75 19.25L12 4.75l7.25 14.5-7.25-3.5-7.25 3.5zM12 15.5v-2.75"}
      ></path>
    </svg>
  );
}

export default SendsvgIcon;
/* prettier-ignore-end */
