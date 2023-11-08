// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BitcoinsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BitcoinsvgIcon(props: BitcoinsvgIconProps) {
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
          "M8.75 6.75V12m0-5.25h5.616c2.853 0 3.927 3.735 1.509 5.25M8.75 6.75h-2m2 5.25v5.25m0-5.25h7.125M8.75 17.25h5.616c2.853 0 3.927-3.735 1.509-5.25M8.75 17.25h-2m4-10.75V4.75m3.5 1.75V4.75m0 14.5v-1.5m-3.5 1.5v-1.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BitcoinsvgIcon;
/* prettier-ignore-end */
