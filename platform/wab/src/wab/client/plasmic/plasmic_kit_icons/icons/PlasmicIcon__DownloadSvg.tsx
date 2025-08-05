/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type DownloadSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DownloadSvgIcon(props: DownloadSvgIconProps) {
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
          "M4.75 14.75v1.5a3 3 0 003 3h8.5a3 3 0 003-3v-1.5m-7.25-.5v-9.5m-3.25 6l3.25 3.5 3.25-3.5"
        }
      ></path>
    </svg>
  );
}

export default DownloadSvgIcon;
/* prettier-ignore-end */
