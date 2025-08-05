/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type KioskSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function KioskSvgIcon(props: KioskSvgIconProps) {
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
          "M5.75 10.225v5.025m0 0h-1m1 0h1m11.5 0v-5.025m0 5.025h1m-1 0h-1m-10.5 0v4h10.5v-4m-10.5 0h10.5M4.75 8L6 4.75h12L19.25 8v1c0 .69-.56 1.25-1.25 1.25S16.5 9.69 16.5 9c0 .69-.81 1.25-1.5 1.25S13.5 9.69 13.5 9c0 .69-.81 1.25-1.5 1.25S10.5 9.69 10.5 9c0 .69-.81 1.25-1.5 1.25S7.5 9.69 7.5 9c0 .69-.81 1.25-1.5 1.25S4.75 9.69 4.75 9V8z"
        }
      ></path>
    </svg>
  );
}

export default KioskSvgIcon;
/* prettier-ignore-end */
