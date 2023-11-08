// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Monitor2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Monitor2SvgIcon(props: Monitor2SvgIconProps) {
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
          "M9.75 15.25h7.5a2 2 0 002-2v-6.5a2 2 0 00-2-2H6.75a2 2 0 00-2 2v6.5a2 2 0 002 2h3zm0 0s.25 3-1.75 4h8c-2-1-1.75-4-1.75-4"
        }
      ></path>
    </svg>
  );
}

export default Monitor2SvgIcon;
/* prettier-ignore-end */
