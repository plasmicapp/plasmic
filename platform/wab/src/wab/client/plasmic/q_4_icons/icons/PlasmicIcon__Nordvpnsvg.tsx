// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type NordvpnsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function NordvpnsvgIcon(props: NordvpnsvgIconProps) {
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
          "M13.5 5.907A7.25 7.25 0 004.907 11.5c-.514 2.427.253 5.078 1.842 6.75L9 12l1 2 2-4 5.251 8.25c.898-.94 1.553-2.384 1.842-3.75A7.25 7.25 0 0013.5 5.907z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default NordvpnsvgIcon;
/* prettier-ignore-end */
