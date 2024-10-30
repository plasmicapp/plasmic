// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PiscesSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PiscesSvgIcon(props: PiscesSvgIconProps) {
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
          "M4.75 4.75s3.5 3.313 3.5 7.25-3.5 7.25-3.5 7.25m14.5-14.5s-3.5 3.313-3.5 7.25 3.5 7.25 3.5 7.25m-13.5-7h12.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PiscesSvgIcon;
/* prettier-ignore-end */
