/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PrintSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PrintSvgIcon(props: PrintSvgIconProps) {
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
          "M4.75 10.75h14.5v6.5a2 2 0 01-2 2H6.75a2 2 0 01-2-2v-6.5zm2-.25V4.75h10.5v5.75m-9.5 5.75h8.5"
        }
      ></path>
    </svg>
  );
}

export default PrintSvgIcon;
/* prettier-ignore-end */
