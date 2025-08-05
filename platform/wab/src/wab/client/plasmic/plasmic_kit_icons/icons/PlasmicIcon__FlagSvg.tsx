/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FlagSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FlagSvgIcon(props: FlagSvgIconProps) {
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
          "M5.75 19.25v-6m0 0v-7.5S8.5 3.5 12 5.75s6.25 0 6.25 0v7.5s-2.75 2.25-6.25 0-6.25 0-6.25 0z"
        }
      ></path>
    </svg>
  );
}

export default FlagSvgIcon;
/* prettier-ignore-end */
