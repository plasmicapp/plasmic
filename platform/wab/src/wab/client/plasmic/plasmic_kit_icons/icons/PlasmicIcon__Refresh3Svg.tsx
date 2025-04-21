/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Refresh3SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Refresh3SvgIcon(props: Refresh3SvgIconProps) {
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
          "M11.25 14.75L8.75 17m0 0l2.5 2.25M8.75 17h4.5a6 6 0 006-6v-.25m-4-3.75h-4.5a6 6 0 00-6 6v.25M15.25 7l-2.5 2.25M15.25 7l-2.5-2.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Refresh3SvgIcon;
/* prettier-ignore-end */
