// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type YAxissvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function YAxissvgIcon(props: YAxissvgIconProps) {
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
          "M19.25 19.25h-.5m-2.5 0h-.5m-2.5 0h-.5m-2.5 0h-.5m-2.75 0V4.75m0 0l-2.25 2.5M7 4.75l2.25 2.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default YAxissvgIcon;
/* prettier-ignore-end */
