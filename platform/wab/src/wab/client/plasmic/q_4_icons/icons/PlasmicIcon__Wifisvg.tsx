// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type WifisvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WifisvgIcon(props: WifisvgIconProps) {
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

      <circle cx={"12"} cy={"18"} r={"1"} fill={"currentColor"}></circle>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M9.5 14.563a4.231 4.231 0 012.5-.813c.934 0 1.798.302 2.5.813m2.213-3.335A8.212 8.212 0 0012 9.75a8.212 8.212 0 00-4.712 1.478M5 7.946a12.194 12.194 0 017-2.196c2.603 0 5.016.812 7 2.196"
        }
      ></path>
    </svg>
  );
}

export default WifisvgIcon;
/* prettier-ignore-end */
