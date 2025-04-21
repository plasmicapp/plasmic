/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type DevicesSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DevicesSvgIcon(props: DevicesSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M7.75 8.25v-.5a1 1 0 011-1h9.5a1 1 0 011 1v10.5a1 1 0 01-1 1h-5.5m-8-1v-6.5a1 1 0 011-1h3.5a1 1 0 011 1v6.5a1 1 0 01-1 1h-3.5a1 1 0 01-1-1z"
        }
      ></path>
    </svg>
  );
}

export default DevicesSvgIcon;
/* prettier-ignore-end */
