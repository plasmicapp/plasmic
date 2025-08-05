/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ServerSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ServerSvgIcon(props: ServerSvgIconProps) {
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
          "M4.75 5.75a1 1 0 011-1h12.5a1 1 0 011 1v3.5a1 1 0 01-1 1H5.75a1 1 0 01-1-1v-3.5zm0 9a1 1 0 011-1h12.5a1 1 0 011 1v3.5a1 1 0 01-1 1H5.75a1 1 0 01-1-1v-3.5zM16.25 5v5m0 4v5"
        }
      ></path>
    </svg>
  );
}

export default ServerSvgIcon;
/* prettier-ignore-end */
