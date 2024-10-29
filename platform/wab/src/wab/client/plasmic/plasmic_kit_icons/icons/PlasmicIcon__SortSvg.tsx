// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SortSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SortSvgIcon(props: SortSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 16 16"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M2 6l2.667-2.667m0 0L7.333 6M4.667 3.333v9.334M14 10l-2.667 2.667m0 0L8.667 10m2.666 2.667V3.333"
        }
        stroke={"currentColor"}
        strokeWidth={"1.25"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SortSvgIcon;
/* prettier-ignore-end */
