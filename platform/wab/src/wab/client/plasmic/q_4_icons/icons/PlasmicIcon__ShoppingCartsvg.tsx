// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ShoppingCartsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ShoppingCartsvgIcon(props: ShoppingCartsvgIconProps) {
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
          "M7.75 7.75h11.5l-1.637 6.958a2 2 0 01-1.947 1.542h-4.127a2 2 0 01-1.933-1.488L7.75 7.75zm0 0l-.75-3H4.75"
        }
      ></path>

      <circle cx={"10"} cy={"19"} r={"1"} fill={"currentColor"}></circle>

      <circle cx={"17"} cy={"19"} r={"1"} fill={"currentColor"}></circle>
    </svg>
  );
}

export default ShoppingCartsvgIcon;
/* prettier-ignore-end */
