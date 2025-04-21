/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Code3SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Code3SvgIcon(props: Code3SvgIconProps) {
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
          "M15.75 8.75l3.5 3.25-3.5 3.25m-7.5-6.5L4.75 12l3.5 3.25m5-9.5l-2.5 12.5"
        }
      ></path>
    </svg>
  );
}

export default Code3SvgIcon;
/* prettier-ignore-end */
