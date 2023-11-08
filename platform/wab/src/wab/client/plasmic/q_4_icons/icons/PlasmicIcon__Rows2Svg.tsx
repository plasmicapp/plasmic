// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Rows2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Rows2SvgIcon(props: Rows2SvgIconProps) {
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
          "M4.75 5.75v.5a1 1 0 001 1h12.5a1 1 0 001-1v-.5a1 1 0 00-1-1H5.75a1 1 0 00-1 1zm0 6v.5a1 1 0 001 1h12.5a1 1 0 001-1v-.5a1 1 0 00-1-1H5.75a1 1 0 00-1 1zm0 6v.5a1 1 0 001 1h12.5a1 1 0 001-1v-.5a1 1 0 00-1-1H5.75a1 1 0 00-1 1z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Rows2SvgIcon;
/* prettier-ignore-end */
