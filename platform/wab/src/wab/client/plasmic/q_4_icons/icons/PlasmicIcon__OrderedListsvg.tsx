// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type OrderedListsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function OrderedListsvgIcon(props: OrderedListsvgIconProps) {
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
          "M4.75 6.25l1.5-1.5v5.5m0 0h-1.5m1.5 0h1m6 4h-1.594a.899.899 0 01-.75-1.393.652.652 0 01.186-.173l1.8-1.198a.68.68 0 00.188-.173c.445-.645-.009-1.563-.827-1.563H10.75m6 5h1.446c1.235 0 1.454 1.888.314 2.206a.73.73 0 01-.17.023l-.59.021.59.02a.725.725 0 01.17.024c1.14.318.92 2.206-.314 2.206H16.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default OrderedListsvgIcon;
/* prettier-ignore-end */
