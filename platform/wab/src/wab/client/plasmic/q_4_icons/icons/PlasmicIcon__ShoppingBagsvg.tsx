// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ShoppingBagsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ShoppingBagsvgIcon(props: ShoppingBagsvgIconProps) {
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
        d={"M18.25 7.75H5.75v9l-1 2.5h14.5l-1-2.5v-9zm0 0l-2-3h-8.5l-2 3"}
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M9.75 10.75v1A2.25 2.25 0 0012 14v0a2.25 2.25 0 002.25-2.25v-1"}
      ></path>
    </svg>
  );
}

export default ShoppingBagsvgIcon;
/* prettier-ignore-end */
