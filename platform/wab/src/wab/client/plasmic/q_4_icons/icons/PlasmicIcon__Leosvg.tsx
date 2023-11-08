// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type LeosvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LeosvgIcon(props: LeosvgIconProps) {
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
        d={"M4.75 12a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0z"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M19.25 17.75l-.51.65a2.21 2.21 0 01-3.948-1.475L15.25 8a3.25 3.25 0 00-6.5 0c0 1.795.469 3.594.469 3.594"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default LeosvgIcon;
/* prettier-ignore-end */
