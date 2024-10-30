// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type NetworkSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function NetworkSvgIcon(props: NetworkSvgIconProps) {
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
          "M8 8h.01M8 16h.01M16 8h.01M16 16h.01m-2.76-4a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zm0-6a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zm6 6a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zm-12 0a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zm6 6a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0z"
        }
      ></path>
    </svg>
  );
}

export default NetworkSvgIcon;
/* prettier-ignore-end */
