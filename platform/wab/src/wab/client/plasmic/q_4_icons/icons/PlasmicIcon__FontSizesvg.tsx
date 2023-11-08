// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FontSizesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FontSizesvgIcon(props: FontSizesvgIconProps) {
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
          "M4.75 19.25L9 6.75l4.25 12.5m-6.75-5h5m3.25-7L17 4.75l2.25 2.5m-4.5 6.5l2.25 2.5 2.25-2.5M17 15.5v-10"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FontSizesvgIcon;
/* prettier-ignore-end */
