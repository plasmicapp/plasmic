// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GavelsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GavelsvgIcon(props: GavelsvgIconProps) {
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
          "M10 14.25L5.75 10 7 8.75l.5.5 2.5-2.5-.5-.5 1.5-1.5L15.25 9 14 10.25l-.5-.5-2.75 2.75.5.5L10 14.25zM12 12l7.25 7.25m-14.5-.5v.5h8.5v-.5a2 2 0 00-2-2h-4.5a2 2 0 00-2 2zM9 8l3 3"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GavelsvgIcon;
/* prettier-ignore-end */
