// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PinTacksvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PinTacksvgIcon(props: PinTacksvgIconProps) {
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
          "M8.75 7.75l-1-3h8.5l-1 3V10c3 1 3 4.25 3 4.25H5.75s0-3.25 3-4.25V7.75zM12 14.5v4.75"
        }
      ></path>
    </svg>
  );
}

export default PinTacksvgIcon;
/* prettier-ignore-end */
