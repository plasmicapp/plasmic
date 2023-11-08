// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Trash2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Trash2SvgIcon(props: Trash2SvgIconProps) {
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
          "M5.75 7.75l.841 9.673a2 2 0 001.993 1.827h5.832a2 2 0 001.993-1.827l.841-9.673H5.75zm4 3v5.5m3.5-5.5v5.5m-4.5-8.5v-1a2 2 0 012-2h1.5a2 2 0 012 2v1m-9.5 0h13.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Trash2SvgIcon;
/* prettier-ignore-end */
