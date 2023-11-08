// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ShoppingBasketsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ShoppingBasketsvgIcon(props: ShoppingBasketsvgIconProps) {
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
          "M16.584 17.662L18.25 9.75H5.75l1.666 7.912a2 2 0 001.957 1.588h5.254a2 2 0 001.957-1.588zM8.75 9.5V7.75a3 3 0 013-3h.5a3 3 0 013 3V9.5m4 .25H4.75"
        }
      ></path>
    </svg>
  );
}

export default ShoppingBasketsvgIcon;
/* prettier-ignore-end */
