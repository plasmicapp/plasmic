// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type DollarSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DollarSvgIcon(props: DollarSvgIconProps) {
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

      <circle
        cx={"12"}
        cy={"12"}
        r={"7.25"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
      ></circle>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M14.25 8.75h-2.875c-.898 0-1.625.728-1.625 1.625v0c0 .898.727 1.625 1.625 1.625h1.25c.898 0 1.625.727 1.625 1.625v0c0 .898-.727 1.625-1.625 1.625H9.75M12 7.75v.5m0 7.5v.5"
        }
      ></path>
    </svg>
  );
}

export default DollarSvgIcon;
/* prettier-ignore-end */
