// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GlobesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GlobesvgIcon(props: GlobesvgIconProps) {
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

      <circle
        cx={"12"}
        cy={"12"}
        r={"7.25"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
      ></circle>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M15.25 12c0 4.5-2.007 7.25-3.25 7.25-1.243 0-3.25-2.75-3.25-7.25S10.757 4.75 12 4.75c1.243 0 3.25 2.75 3.25 7.25zM5 12h14"
        }
      ></path>
    </svg>
  );
}

export default GlobesvgIcon;
/* prettier-ignore-end */
