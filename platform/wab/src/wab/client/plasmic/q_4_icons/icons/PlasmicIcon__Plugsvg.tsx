// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PlugsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PlugsvgIcon(props: PlugsvgIconProps) {
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
          "M18.281 12.031L11.97 5.72a1 1 0 00-1.596.249L6.75 13 11 17.25l7.032-3.623a1 1 0 00.25-1.596zM4.75 19.25L8.5 15.5m5.25-8.25l2.5-2.5m.5 5.5l2.5-2.5"
        }
      ></path>
    </svg>
  );
}

export default PlugsvgIcon;
/* prettier-ignore-end */
