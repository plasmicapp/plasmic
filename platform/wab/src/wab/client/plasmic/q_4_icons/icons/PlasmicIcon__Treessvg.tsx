// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type TreessvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TreessvgIcon(props: TreessvgIconProps) {
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
          "M9.25 13a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm10-4a4.25 4.25 0 11-8.5 0 4.25 4.25 0 018.5 0zM7 13.75v5.5m8-9.5v9.5m4.25 0H4.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default TreessvgIcon;
/* prettier-ignore-end */
