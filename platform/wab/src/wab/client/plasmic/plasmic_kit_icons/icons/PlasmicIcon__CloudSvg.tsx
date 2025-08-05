/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CloudSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CloudSvgIcon(props: CloudSvgIconProps) {
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
          "M4.75 14A3.25 3.25 0 008 17.25h8a3.25 3.25 0 00.243-6.491 4.25 4.25 0 00-8.486 0A3.25 3.25 0 004.75 14z"
        }
      ></path>
    </svg>
  );
}

export default CloudSvgIcon;
/* prettier-ignore-end */
