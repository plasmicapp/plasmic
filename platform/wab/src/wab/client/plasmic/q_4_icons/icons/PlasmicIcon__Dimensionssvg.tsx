// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DimensionssvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DimensionssvgIcon(props: DimensionssvgIconProps) {
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
          "M10.75 12.75a2 2 0 012-2h4.5a2 2 0 012 2v4.5a2 2 0 01-2 2h-4.5a2 2 0 01-2-2v-4.5zm-6-3.5L6 7.75l1.25 1.5m4-2L10 6l1.25-1.25M18 7.25L19.25 6 18 4.75m-13.25 13L6 19.25l1.25-1.5M6 18.5v-10M19 6h-8"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DimensionssvgIcon;
/* prettier-ignore-end */
