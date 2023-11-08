// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FingerprintsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FingerprintsvgIcon(props: FingerprintsvgIconProps) {
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
        d={
          "M19.25 19.25V12c0-2.591-1.408-5.04-3.5-6.25m-11 9v4.5m0-7C4.5 7.5 8.134 4.75 12 4.75m0 4c1.795 0 3.25 1.25 3.25 3.5m0 2.5v1.5m-6.5-.5v1.5c0 1.25-1 2-1 2m4-6.5v3.5c0 1.75.8 3 3 3M9.116 10.5A3.236 3.236 0 008.75 12v1.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FingerprintsvgIcon;
/* prettier-ignore-end */
