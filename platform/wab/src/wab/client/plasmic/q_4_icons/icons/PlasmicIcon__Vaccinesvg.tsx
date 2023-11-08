// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type VaccinesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function VaccinesvgIcon(props: VaccinesvgIconProps) {
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
          "M9 6.75L6.75 9l8.125 8.125a1.591 1.591 0 002.25-2.25L9 6.75zm-1.5.75L5.75 5.75m0 0l1-1m-1 1l-1 1M17.5 17.5l1.75 1.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default VaccinesvgIcon;
/* prettier-ignore-end */
