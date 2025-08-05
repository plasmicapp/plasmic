/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ColumnsSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ColumnsSvgIcon(props: ColumnsSvgIconProps) {
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
          "M5.75 19.25h3.5a1 1 0 001-1V5.75a1 1 0 00-1-1h-3.5a1 1 0 00-1 1v12.5a1 1 0 001 1zm9 0h3.5a1 1 0 001-1V5.75a1 1 0 00-1-1h-3.5a1 1 0 00-1 1v12.5a1 1 0 001 1z"
        }
      ></path>
    </svg>
  );
}

export default ColumnsSvgIcon;
/* prettier-ignore-end */
