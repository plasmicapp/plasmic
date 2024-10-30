// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ReceiptSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ReceiptSvgIcon(props: ReceiptSvgIconProps) {
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
          "M13.75 4.75h-8v14.5l1.599-1.243a1 1 0 011.272.036L10 19.25l1.341-1.174a1 1 0 011.318 0L14 19.25l1.379-1.207a1 1 0 011.272-.036l1.599 1.243v-9m-4.5-5.5l4.5 5.5m-4.5-5.5v3.5a2 2 0 002 2h2.5"
        }
      ></path>
    </svg>
  );
}

export default ReceiptSvgIcon;
/* prettier-ignore-end */
