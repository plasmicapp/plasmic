// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type EyesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EyesvgIcon(props: EyesvgIconProps) {
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
          "M19.25 12c0 1-1.75 6.25-7.25 6.25S4.75 13 4.75 12 6.5 5.75 12 5.75 19.25 11 19.25 12z"
        }
      ></path>

      <circle
        cx={"12"}
        cy={"12"}
        r={"2.25"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
      ></circle>
    </svg>
  );
}

export default EyesvgIcon;
/* prettier-ignore-end */
